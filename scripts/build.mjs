import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) await copyFile(path.join(root, file), path.join(dist, file));

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';
const demo = String(process.env.DEMO_MODE ?? (!url || !key)).toLowerCase() !== 'false';
const config = `window.APP_CONFIG = ${JSON.stringify({ SUPABASE_URL:url, SUPABASE_ANON_KEY:key, DEMO_MODE:demo }, null, 2)};\n`;
await writeFile(path.join(dist, 'config.js'), config);

const html = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('project-detail-view')) throw new Error('La vista de proyecto no quedó incluida en el build.');
console.log(`Build listo en dist/ (${demo ? 'modo demostración' : 'Supabase'}).`);
