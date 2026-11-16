import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';

const execute = promisify(execFile);
const [mode, stateFile, sourceKeys] = process.argv.slice(2);
const artist = process.env.ARTIST_URL;
assert(artist && stateFile, 'Supply an artist loopback origin and state file.');
assert.equal(new URL(artist).hostname, '127.0.0.1');
const login = await fetch(`${artist}/api/users/login`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  }),
});
assert.equal(login.status, 200);
const {token} = await login.json();
const headers = {Authorization: `JWT ${token}`};

async function waitForStatus(id, expected, timeout = 240000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const response = await fetch(`${artist}/api/media/${id}`, {headers});
    assert.equal(response.status, 200);
    const media = await response.json();
    assert.notEqual(
      media.processingStatus,
      'failed',
      'Video processing succeeds.',
    );
    if (media.processingStatus === expected) return media;
    if (expected === 'processing') {
      assert.notEqual(
        media.processingStatus,
        'ready',
        'Observe a live encoding before killing the worker.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.fail(`Media did not reach ${expected}.`);
}

if (mode === 'queue') {
  const source = path.join(path.dirname(stateFile), 'recovery-source.mp4');
  await execute(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=640x360:rate=30',
      '-t',
      '4',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '35',
      '-pix_fmt',
      'yuv420p',
      '-an',
      source,
    ],
    {timeout: 60000},
  );
  const file = await readFile(source);
  const form = new FormData();
  form.set('_payload', JSON.stringify({alt: 'Worker crash recovery video'}));
  form.set(
    'file',
    new Blob([file], {type: 'video/mp4'}),
    'recovery-source.mp4',
  );
  const response = await fetch(`${artist}/api/media`, {
    method: 'POST',
    headers,
    body: form,
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  await writeFile(stateFile, JSON.stringify({id: body.doc.id}));
  await waitForStatus(body.doc.id, 'processing', 30000);
  process.stdout.write('Video job claimed before worker crash.\n');
} else {
  assert.equal(mode, 'verify');
  const {id} = JSON.parse(await readFile(stateFile, 'utf8'));
  const media = await waitForStatus(id, 'ready');
  for (const [name, codec] of [
    ['webm', 'av1'],
    ['mp4', 'h264'],
  ]) {
    const output = media.video[name];
    assert(output?.url, `${name} is published after worker recovery.`);
    const url = new URL(output.url, artist);
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const file = path.join(path.dirname(stateFile), `recovered.${name}`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    const {stdout} = await execute('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name,width,height',
      '-of',
      'json',
      file,
    ]);
    const stream = JSON.parse(stdout).streams[0];
    assert.equal(stream.codec_name, codec);
    assert(stream.width <= 1920 && stream.height <= 1080);
    const range = await fetch(url, {headers: {Range: 'bytes=0-15'}});
    assert.equal(range.status, 206);
    assert.equal((await range.arrayBuffer()).byteLength, 16);
    assert.match(range.headers.get('content-range'), /^bytes 0-15\//);
    const invalid = await fetch(url, {headers: {Range: 'bytes=999999999999-'}});
    assert.equal(invalid.status, 416);
  }
  for (const [name, mime] of [
    ['poster', 'image/webp'],
    ['preview', 'image/gif'],
  ]) {
    const response = await fetch(new URL(media.video[name].url, artist));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), new RegExp(mime));
    if (name === 'preview') {
      const buffer = Buffer.from(await response.arrayBuffer());
      assert(buffer.length < 2000000);
      const file = path.join(path.dirname(stateFile), 'recovered.gif');
      await writeFile(file, buffer);
      const {stdout} = await execute('ffprobe', [
        '-v',
        'error',
        '-count_frames',
        '-show_entries',
        'stream=nb_read_frames',
        '-of',
        'json',
        file,
      ]);
      assert(Number(JSON.parse(stdout).streams[0].nb_read_frames) > 1);
    }
  }
  const privateKeys = JSON.parse(sourceKeys);
  assert(privateKeys.length > 0, 'Inspect actual retained source keys.');
  for (const key of privateKeys) {
    for (const filename of [key, `originals/${key}`]) {
      assert.notEqual(
        (
          await fetch(
            `${artist}/api/media/file/${encodeURIComponent(filename)}`,
          )
        ).status,
        200,
        'An actual private source cannot be retrieved through public delivery.',
      );
    }
  }
  assert.equal((await fetch(`${artist}/api/media-generations`)).status, 403);
  process.stdout.write(
    'Worker crash recovery, codecs, previews, and video seeking passed.\n',
  );
}
