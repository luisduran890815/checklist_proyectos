import { access, readFile } from 'node:fs/promises';
const required = ['index.html','styles.css','app.js','config.js','netlify.toml','supabase/migrations/202610010001_initial.sql'];
await Promise.all(required.map(file => access(new URL(`../${file}`, import.meta.url))));
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const ref of ['styles.css','config.js','app.js']) {
  if (!html.includes(ref)) throw new Error(`Falta la referencia a ${ref}`);
}
console.log('Estructura y referencias verificadas.');
