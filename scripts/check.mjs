import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'index.html',
  'styles.css',
  'app.js',
  'config.js',
  'config.example.js',
  'supabase/migrations/202610270001_project_access.sql'
];

await Promise.all(required.map(file => access(file, constants.R_OK)));

const [html, js, sql] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('supabase/migrations/202610270001_project_access.sql', 'utf8')
]);

const requiredIds = [
  'app', 'auth-screen', 'project-list', 'entity-form', 'confirm-dialog',
  'access-dialog', 'access-form', 'access-members', 'member-email', 'member-role',
  'form-close-btn', 'form-cancel-btn'
];
const missingIds = requiredIds.filter(id => !html.includes(`id="${id}"`));
if (missingIds.length) throw new Error(`Faltan IDs en index.html: ${missingIds.join(', ')}`);

const requiredAccessHooks = [
  'get_project_members', 'manage_project_member', 'remove_project_member',
  'create_project_with_owner', 'canEditContent', 'canManageProject',
  'openAccessManager', 'closeFormDialog'
];
const missingHooks = requiredAccessHooks.filter(hook => !js.includes(hook));
if (missingHooks.length) throw new Error(`Faltan integraciones de acceso en app.js: ${missingHooks.join(', ')}`);

const requiredSql = [
  'project_members', 'enable row level security', 'projects_select',
  'checklist_items_update', 'create_project_with_owner',
  'manage_project_member', 'remove_project_member'
];
const lowerSql = sql.toLowerCase();
const missingSql = requiredSql.filter(token => !lowerSql.includes(token));
if (missingSql.length) throw new Error(`La migración RLS está incompleta: ${missingSql.join(', ')}`);

if (/id="entity-form"\s+method="dialog"/.test(html)) {
  throw new Error('El formulario principal no debe usar method="dialog": Cancelar volvería a disparar el guardado.');
}
if (!html.includes('data-close-form-dialog')) {
  throw new Error('Faltan los controles explícitos para cerrar el formulario.');
}
if (!js.includes('Authorization: `Bearer ${token}`')) {
  throw new Error('El cliente Supabase no está enviando el JWT autenticado.');
}

console.log('Verificación completada: modal, creación segura, accesos y RLS presentes.');
