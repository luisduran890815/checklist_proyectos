import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';

const dist = 'dist';
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'styles.css', 'app.js']) {
  await copyFile(file, `${dist}/${file}`);
}

const sourceConfig = await readFile('config.js', 'utf8');
const envConfigured = process.env.SUPABASE_URL || process.env.SUPABASE_ANON_KEY || process.env.DEMO_MODE;
if (!envConfigured) {
  await writeFile(`${dist}/config.js`, sourceConfig);
} else {
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    DEMO_MODE: String(process.env.DEMO_MODE || 'true').toLowerCase() !== 'false'
  };
  await writeFile(`${dist}/config.js`, `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`);
}

console.log('Build generado en dist/.');
