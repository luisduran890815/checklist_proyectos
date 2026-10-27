# Bitácora de proyectos 2.1

Aplicación web para seguimiento operativo con estructura **Proyecto → Área → Actividad**, checklist, compras y **diagrama de Gantt interactivo**. Está construida con HTML, CSS y JavaScript estándar, sin framework de frontend.

## Qué incluye esta actualización

- Cronograma Gantt por proyecto, con escalas de día, semana y mes.
- Barras por fecha inicial y final, línea de hoy y estados: terminado, en ejecución, vencido y por iniciar.
- Actualización del avance desde el propio Gantt en pasos de 5 %.
- Programación por fecha de inicio, duración en días calendario y fecha final calculada.
- Responsable, proveedor y área visibles en el cronograma.
- Lista separada de actividades sin programación o con fechas por corregir.
- Persistencia de estado del proyecto, descripción y orden de las áreas.
- Exportación CSV con avance, responsable, proveedor, fechas y duración.
- Diseño adaptable para escritorio, tableta y móvil.
- Scripts de validación y build restaurados; configuración para Netlify y GitHub Pages.

## Estructura

```text
bitacora-proyectos-gantt/
├── index.html
├── styles.css
├── app.js
├── config.js                    # Configuración local; no subir a Git
├── config.example.js
├── .env.example
├── netlify.toml
├── package.json
├── scripts/
│   ├── build.mjs
│   └── check.mjs
├── supabase/migrations/
│   ├── 202610010001_initial.sql
│   └── 202610270001_gantt_update.sql
└── .github/workflows/pages.yml
```

## Prueba inmediata sin Supabase

1. En `config.js`, deje `DEMO_MODE: true` o quite las credenciales.
2. Abra `index.html` en un navegador moderno.
3. Entre a un proyecto desde **Resumen** o **Proyectos**.
4. La pestaña inicial será **Cronograma Gantt**.

La demostración usa `localStorage`. Si ya usó una versión anterior, los datos se migran en el navegador y los campos nuevos reciben valores predeterminados.

También puede servir el proyecto por HTTP:

```bash
python3 -m http.server 8080
# Abrir http://localhost:8080
```

## Actualizar una base Supabase existente

Este es el paso obligatorio para que el Gantt guarde proveedor, responsable, fechas y avance.

1. Abra **Supabase → SQL Editor**.
2. Copie y ejecute completo:

```text
supabase/migrations/202610270001_gantt_update.sql
```

3. Espere el mensaje de ejecución correcta.
4. Vuelva a desplegar la aplicación.
5. Cierre sesión y vuelva a entrar. Si PostgREST mantuvo el esquema anterior en caché, espere unos segundos y recargue.

La migración es no destructiva: agrega columnas e índices y conserva los proyectos, áreas y actividades existentes.

## Instalación nueva de Supabase

Para una base nueva, ejecute solamente:

```text
supabase/migrations/202610010001_initial.sql
```

Crea:

- `projects`: propietario, código, nombre, descripción y estado.
- `areas`: proyecto, nombre, descripción y orden.
- `checklist_items`: actividad, estado, compras, responsable, proveedor, fechas y avance.
- Índices, marcas de actualización y políticas RLS por propietario.

Después configure `config.js` para desarrollo local:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU_CLAVE_ANON_O_PUBLISHABLE',
  DEMO_MODE: false
};
```

Use únicamente la clave pública `anon`/publishable. **Nunca incluya `service_role` en una aplicación web.**

## Cómo usar el Gantt

1. Cree o abra un proyecto.
2. Cree al menos un área.
3. Cree o edite una actividad.
4. Complete **Fecha de inicio** y **Tiempo de ejecución**; la fecha final se calcula automáticamente.
5. Seleccione **Día**, **Semana** o **Mes** en el cronograma.
6. Mueva el control de avance de una actividad. Al llegar a 100 %, queda en estado **OK**.
7. Haga clic en el nombre o la barra para editar sus datos.

Los colores indican:

- Verde: terminado.
- Amarillo: en ejecución.
- Rojo: vencido.
- Gris azulado: por iniciar.

## Verificación y build

Requiere Node.js 18 o superior y no instala dependencias:

```bash
npm run check
npm run build
```

`npm run build` genera `dist/`. Si no recibe credenciales por variables de entorno, crea una demostración segura.

Build conectado:

```bash
SUPABASE_URL='https://TU-PROYECTO.supabase.co' \
SUPABASE_ANON_KEY='TU_CLAVE_PUBLICA' \
DEMO_MODE=false npm run build
```

## Despliegue en Netlify

1. Suba la carpeta a GitHub.
2. En Netlify, importe el repositorio.
3. El archivo `netlify.toml` define `npm run build` y la publicación desde `dist`.
4. Agregue las variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `DEMO_MODE=false`
5. En Supabase, agregue la URL final a **Authentication → URL Configuration → Redirect URLs**.

## Despliegue en GitHub Pages

1. Suba el proyecto a la rama `main`.
2. En **Settings → Pages**, seleccione **GitHub Actions**.
3. Cree los secretos `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
4. Cree la variable `DEMO_MODE` con valor `false`.
5. Ejecute el workflow o haga `push`.

## Seguridad

- `config.js` está excluido por `.gitignore`; las plataformas generan `dist/config.js` desde variables de entorno.
- La clave pública no sustituye las políticas RLS.
- Las tablas solo son visibles para el propietario autenticado del proyecto.
- La exportación CSV se produce localmente en el navegador.

## Solución rápida de problemas

- **Error indicando que no existe `planned_start`, `progress` u otra columna:** ejecute la migración de actualización.
- **La aplicación abre en demostración:** revise las variables del despliegue y haga un deploy sin caché.
- **No aparecen registros:** confirme que inició sesión con el propietario de esos proyectos y que RLS está activo.
- **Una actividad no aparece en el Gantt:** complete ambas fechas y verifique que la final no sea anterior a la inicial.
- **GitHub no incluye `config.js`:** es intencional; el workflow lo genera dentro de `dist/`.

## Licencia

MIT © 2026 Luis Eduardo Durán Mora.
