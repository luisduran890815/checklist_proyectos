import { cp, mkdir, rm, writeFile } from 'node:fs/promises';

const demo = String(process.env.DEMO_MODE ?? '').toLowerCase();
const hasCloudConfig = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
const demoMode = demo ? demo !== 'false' : !hasCloudConfig;
const dist = new URL('../dist/', import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, dist));
}
const config = `window.APP_CONFIG = ${JSON.stringify({
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  DEMO_MODE: demoMode
}, null, 2)};\n`;
await writeFile(new URL('config.js', dist), config, 'utf8');
console.log(`Build listo en dist/ (${demoMode ? 'modo demostración' : 'Supabase'})`);
