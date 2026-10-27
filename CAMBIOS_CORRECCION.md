# Corrección aplicada — creación de proyectos y modal

## Problemas corregidos

1. **Error RLS al crear proyectos**
   - La creación ahora se realiza mediante la función segura `create_project_with_owner`.
   - El propietario se obtiene en Supabase con `auth.uid()`; no se confía en un `owner_id` enviado por el navegador.
   - El proyecto y su membresía `owner` se guardan en la misma transacción.
   - El cliente REST usa el JWT de la sesión en el encabezado `Authorization`.

2. **Botones X y Cancelar**
   - Ya no son botones de envío del formulario.
   - Ambos cierran explícitamente el diálogo sin ejecutar `saveForm`.
   - También se puede cerrar con Escape o haciendo clic sobre el fondo del diálogo.
   - Se bloquea el botón Crear/Guardar mientras la petición está en curso para evitar registros duplicados.

3. **Compatibilidad conservada**
   - No se borran ni recrean proyectos, áreas, checklist o datos del Gantt.
   - Se mantiene `project_members` y la administración gráfica de roles.
   - Propietario y Administrador conservan control total; Editor puede modificar contenido y Gantt; Visualizador permanece en solo lectura.
   - La migración vuelve a aplicar las políticas a las tablas existentes cuyo nombre contiene `gantt` y que tienen `project_id`, sin modificar sus datos.

## Pasos obligatorios para publicar

1. Hacer respaldo de Supabase.
2. En **Supabase → SQL Editor**, ejecutar completo:
   `supabase/migrations/202610270001_project_access.sql`
3. Publicar el proyecto completo o ejecutar `npm run build` y desplegar `dist/`.
4. En Netlify, usar **Clear cache and deploy site**.
5. Cerrar sesión en la aplicación y volver a ingresar.
6. Probar creación de proyecto y administración de accesos.

> Si el repositorio ya tiene una URL y una clave pública de Supabase configuradas, conserve esos valores o use las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `DEMO_MODE=false` en Netlify. No use `service_role` en el frontend.

## Verificación realizada

```bash
npm run check
npm run build
node --check dist/app.js
```

Los tres comandos finalizaron correctamente.
