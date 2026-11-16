import catalog from './schema-catalog.json';

const parents = new Map(catalog.types.map((type) => [type.name, type.parents]));

export function isSchemaSubtype(type: string, ancestor: string): boolean {
  const pending = [type];
  const visited = new Set<string>();
  while (pending.length) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    if (current === ancestor) return true;
    visited.add(current);
    pending.push(...(parents.get(current) ?? []));
  }
  return false;
}

export const workSchemaTypes = catalog.types
  .filter(({name}) => isSchemaSubtype(name, 'CreativeWork'))
  .map(({name}) => name);
export const pageSchemaTypes = catalog.types
  .filter(({name}) => isSchemaSubtype(name, 'WebPage'))
  .map(({name}) => name);
