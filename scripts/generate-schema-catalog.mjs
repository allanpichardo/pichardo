import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {format, resolveConfig} from 'prettier';

const version = '30.1';
const source = `https://raw.githubusercontent.com/schemaorg/schemaorg/main/data/releases/${version}/schemaorg-current-https.jsonld`;
const response = await fetch(source);
if (!response.ok)
  throw new Error(`Schema.org download failed: ${response.status}`);
const text = await response.text();
const vocabulary = JSON.parse(text);
const ids = (value) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => (typeof item === 'string' ? item : item['@id']))
    .filter(Boolean);
const localName = (value) =>
  value.replace(/^https?:\/\/schema.org\//, '').replace(/^schema:/, '');
const types = vocabulary['@graph']
  .filter((term) => ids(term['@type']).includes('rdfs:Class'))
  .map((term) => ({
    name: localName(term['@id']),
    parents: ids(term['rdfs:subClassOf']).map(localName).sort(),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
if (!types.some((type) => type.name === 'CreativeWork')) {
  throw new Error('Downloaded vocabulary has no CreativeWork class.');
}
const target = new URL(
  '../apps/artist/src/seo/schema-catalog.json',
  import.meta.url,
);
await writeFile(
  target,
  await format(
    JSON.stringify({
      version,
      source,
      sha256: createHash('sha256').update(text).digest('hex'),
      types,
    }),
    {...(await resolveConfig(target.pathname)), parser: 'json'},
  ),
);
