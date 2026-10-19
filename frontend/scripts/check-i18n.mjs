// Checks that ar/en/tr have the same keys and that every literal t('key') used in src exists.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const keys = (file) => new Set([...readFileSync(file, 'utf8').matchAll(/^\s*'([^']+)':|,\s*'([^']+)':/gm)].map((m) => m[1] ?? m[2]));
const dir = new URL('../src/i18n/', import.meta.url).pathname;
const en = keys(join(dir, 'en.ts'));
let bad = 0;
for (const lang of ['ar', 'tr']) {
    const k = keys(join(dir, `${lang}.ts`));
    for (const x of en) if (!k.has(x)) (bad++, console.log(`${lang}: missing ${x}`));
    for (const x of k) if (!en.has(x)) (bad++, console.log(`${lang}: extra ${x}`));
}
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.tsx') ? [join(d, f)] : []));
for (const f of walk(new URL('../src', import.meta.url).pathname)) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\('([a-z0-9_.]+)'/g)) if (!en.has(m[1])) (bad++, console.log(`${f}: unknown key ${m[1]}`));
}
console.log(bad ? `${bad} problem(s)` : `i18n OK — ${en.size} keys in ar/en/tr`);
process.exit(bad ? 1 : 0);
