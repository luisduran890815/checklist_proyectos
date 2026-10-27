# Actualización: accesos por proyecto

## Puesta en producción

1. Haga un respaldo de la base de datos de Supabase.
2. Ejecute el archivo actualizado `supabase/migrations/202610270001_project_access.sql` en **Supabase → SQL Editor**. Es seguro volver a ejecutarlo: conserva los datos y deja actualizadas las funciones y políticas. Si usa Supabase CLI, ejecute `supabase db push`.
3. Publique los archivos actualizados (`index.html`, `styles.css`, `app.js` y la configuración existente) o ejecute `npm run build` y despliegue la carpeta `dist/`.
4. En Netlify, ejecute **Deploy site** o **Clear cache and deploy site** para evitar servir el JavaScript anterior.
5. Cierre sesión, vuelva a ingresar y pruebe: crear proyecto, cerrar el modal con **X**, cerrar con **Cancelar** y administrar accesos.
6. Verifique con cuentas de prueba para cada rol.

Después de esta migración, agregar, cambiar o quitar usuarios se hace desde **Proyectos → 👥 Administrar accesos**; no se requieren consultas SQL para la operación normal.

## Matriz aplicada

| Rol | Proyecto | Checklist y áreas | Tablas Gantt con `project_id` | Usuarios |
|---|---|---|---|---|
| Propietario | Control total | Escritura | Escritura | Administrar |
| Administrador/Propietario | Control total | Escritura | Escritura | Administrar |
| Editor | Consulta | Escritura | Escritura | Sin acceso |
| Visualizador | Solo lectura | Solo lectura | Solo lectura | Sin acceso |

## Condiciones importantes

- El propietario original se obtiene de `projects.owner_id`, se registra automáticamente en `project_members` y no puede quitarse ni degradarse.
- La creación usa la función `create_project_with_owner`, que obtiene el propietario desde la sesión autenticada y evita depender de un `owner_id` enviado por el navegador.
- El usuario que se agregue debe existir previamente en Supabase Authentication.
- La interfaz adjunta no contiene una vista Gantt. La migración detecta tablas públicas cuyo nombre contiene `gantt` y que tienen una columna `project_id`, y aplica la misma matriz RLS sin cambiar su estructura ni sus datos.
- No use una clave `service_role` en el frontend.

## Verificación técnica

```bash
npm run check
npm run build
```
