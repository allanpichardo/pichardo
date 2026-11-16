import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';

const [mode, stateFile] = process.argv.slice(2);
const artist = process.env.ARTIST_URL;
const professional = process.env.PROFESSIONAL_URL;
assert(
  artist && professional && stateFile,
  'Supply loopback origins and a state file.',
);
assert.equal(new URL(artist).hostname, '127.0.0.1');
assert.equal(new URL(professional).hostname, '127.0.0.1');

async function login() {
  const response = await fetch(`${artist}/api/users/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(response.status, 200, 'Administrator can log in.');
  const {token} = await response.json();
  assert.equal(typeof token, 'string');
  return {Authorization: `JWT ${token}`};
}

async function waitForMedia(id) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const response = await fetch(`${artist}/api/media/${id}`, {headers});
    assert.equal(response.status, 200);
    const media = await response.json();
    assert.notEqual(
      media.processingStatus,
      'failed',
      'Media processing succeeds.',
    );
    if (media.processingStatus === 'ready') return media;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.fail('Media worker did not publish within two minutes.');
}

for (const origin of [artist, professional]) {
  const response = await fetch(`${origin}/health`);
  assert.equal(response.status, 200, `${origin} is healthy.`);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.deepEqual(await response.json(), {status: 'ok'});
  assert.equal((await fetch(origin)).status, 200);
}
const mdx = await fetch(`${professional}/mdx-example`);
assert.match(await mdx.text(), /MDX example/);
assert.equal((await fetch(`${artist}/admin/login`)).status, 200);
const headers = await login();

if (mode === 'seed') {
  const file = await readFile(
    new URL('../tests/fixtures/media.png', import.meta.url),
  );
  const data = new FormData();
  data.set(
    '_payload',
    JSON.stringify({alt: 'Container persistence test image'}),
  );
  data.set(
    'file',
    new Blob([file], {type: 'image/png'}),
    'container-smoke.png',
  );
  assert.equal((await fetch(`${artist}/api/users`)).status, 403);
  const response = await fetch(`${artist}/api/media`, {
    method: 'POST',
    headers,
    body: data,
  });
  assert.equal(response.status, 201, 'Authenticated image upload succeeds.');
  const {doc: pending} = await response.json();
  const doc = await waitForMedia(pending.id);
  const published = await fetch(`${artist}/api/media/file/${doc.filename}`);
  assert.equal(published.status, 200);
  const publishedHash = createHash('sha256')
    .update(Buffer.from(await published.arrayBuffer()))
    .digest('hex');
  await writeFile(
    stateFile,
    JSON.stringify({
      id: doc.id,
      filename: doc.filename,
      hash: publishedHash,
      variants: [
        doc.sizes.small.filename,
        doc.sizes.medium.filename,
        doc.sizes.large.filename,
      ],
    }),
  );
} else {
  assert.equal(mode, 'verify');
}

const state = JSON.parse(await readFile(stateFile, 'utf8'));
const metadata = await fetch(`${artist}/api/media/${state.id}`);
assert.equal(metadata.status, 200, 'Media record survives.');
assert.equal((await metadata.json()).filename, state.filename);
for (const filename of [state.filename, ...state.variants]) {
  const response = await fetch(`${artist}/api/media/file/${filename}`);
  assert.equal(response.status, 200, 'Original or variant survives.');
  assert.match(response.headers.get('cache-control'), /public, max-age=3600/);
  if (filename === state.filename) {
    const hash = createHash('sha256')
      .update(Buffer.from(await response.arrayBuffer()))
      .digest('hex');
    assert.equal(hash, state.hash, 'Published media checksum matches.');
  }
}
process.stdout.write(`Container ${mode} checks passed.\n`);
