# Bitácora de proyectos + Gantt

Aplicación web sin frameworks para controlar proyectos mediante **Proyecto → Área → Actividades**, ahora con una vista interna por proyecto y un **cronograma Gantt interactivo**.

## Mejoras de la versión 2.0

- Cada tarjeta tiene acceso a **Abrir proyecto / Cronograma**.
- Vista interna con dos pestañas:
  - **Cronograma Gantt**.
  - **Checklist operativo**.
- Cada actividad admite:
  - proveedor;
  - responsable;
  - fecha de inicio;
  - tiempo de ejecución en días calendario;
  - fecha de terminación calculada;
  - avance de 0 % a 100 %;
  - estado, observaciones, SOLPED y OC.
- El Gantt incluye:
  - escalas Día, Semana y Mes;
  - línea de “Hoy”;
  - colores para terminada, en ejecución, vencida y por iniciar;
  - actualización rápida del avance con deslizador;
  - búsqueda por actividad, proveedor o responsable;
  - sección de actividades sin programar.
- Exportación CSV ampliada con todos los campos del cronograma.
- Diseño adaptable para escritorio, tableta y móvil.

## Prueba inmediata en modo demostración

1. En `config.js`, use `DEMO_MODE: true`.
2. Abra `index.html` en un navegador moderno, o ejecute:

```bash
python3 -m http.server 8080
```

3. Abra `http://localhost:8080`.

Los cambios quedan en `localStorage`. El botón de salida reinicia los datos de demostración.

## Actualización obligatoria de Supabase

Antes de usar la nueva versión con su base de datos, abra **Supabase → SQL Editor** y ejecute:

```text
supabase/migrations/202610270001_gantt_fields.sql
```

La migración agrega a `checklist_items`:

| Campo | Tipo | Uso |
|---|---|---|
| `supplier` | text | Proveedor o contratista |
| `responsible` | text | Responsable interno |
| `planned_start` | date | Inicio planeado |
| `planned_end` | date | Terminación planeada |
| `progress` | smallint | Avance entre 0 y 100 |

La migración es aditiva, conserva los registros actuales y asigna 100 % a las actividades que ya estén en estado `OK`.

## Configuración

Para una prueba local conectada, complete `config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'clave-anon-publica',
  DEMO_MODE: false
};
```

Use únicamente la clave pública `anon`/publishable. Nunca incluya `service_role` en el frontend.

## Verificación y build

Requiere Node.js 18 o superior y no instala dependencias:

```bash
npm run check
npm run build
```

El build genera `dist/`. Si no se proporcionan variables, se genera en modo demostración.

Build conectado a Supabase:

```bash
SUPABASE_URL='https://xxxx.supabase.co' \
SUPABASE_ANON_KEY='clave-anon-publica' \
DEMO_MODE=false npm run build
```

## Despliegue en Netlify

1. Suba la carpeta a GitHub.
2. En Netlify, importe el repositorio.
3. Netlify leerá `netlify.toml`:
   - comando: `npm run build`;
   - publicación: `dist`.
4. Cree estas variables de entorno:
   - `SUPABASE_URL`;
   - `SUPABASE_ANON_KEY`;
   - `DEMO_MODE=false`.
5. Despliegue de nuevo.
6. Agregue la URL de Netlify a **Supabase → Authentication → URL Configuration → Redirect URLs**.

## Flujo recomendado

1. Cree el proyecto.
2. Abra el proyecto desde la tarjeta o desde **Proyectos → Cronograma**.
3. Cree las áreas o frentes de trabajo.
4. Registre actividades con responsable, proveedor, inicio y tiempo de ejecución.
5. Controle el avance desde el deslizador del Gantt.
6. Programe las actividades que aparezcan en **Sin programar**.
7. Revise las actividades vencidas y exporte el corte a CSV.

## Archivos principales

```text
index.html                                  Interfaz y diálogos
styles.css                                 Diseño adaptable y Gantt
app.js                                     Estado, CRUD, Gantt y acceso REST
config.js                                  Configuración local
scripts/build.mjs                          Build para Netlify/GitHub
scripts/check.mjs                          Verificación estructural
supabase/migrations/202610270001_gantt_fields.sql
netlify.toml                               Configuración de despliegue
```

## Nota de compatibilidad

El modo demostración funciona inmediatamente. En modo Supabase, la migración indicada es necesaria antes de crear o editar actividades con los nuevos campos del cronograma.
