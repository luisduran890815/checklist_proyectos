import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = ['index.html','styles.css','app.js','config.example.js','supabase/migrations/202610270001_gantt_fields.sql'];
for (const file of required) await access(path.join(root,file));
const html = await readFile(path.join(root,'index.html'),'utf8');
const js = await readFile(path.join(root,'app.js'),'utf8');
const css = await readFile(path.join(root,'styles.css'),'utf8');
for (const id of ['project-detail-view','project-detail','detail-back-btn']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Falta #${id} en index.html`);
for (const token of ['renderGantt','supplier','responsible','planned_start','progress']) if (!js.includes(token)) throw new Error(`Falta ${token} en app.js`);
for (const token of ['.gantt-board','.gantt-bar','.project-hero']) if (!css.includes(token)) throw new Error(`Falta ${token} en styles.css`);
console.log('Verificación estructural completada.');
