# Gestor de Rifas

Aplicación web de un solo archivo (`index.html`) para gestionar una rifa: tablero de números, registro de ventas por vendedor y total recaudado. No necesita servidor ni Node.js.

Guarda los datos en **Google Sheets** o en **Supabase**. Sin ninguno de los dos funciona en **modo demo** (los datos se quedan solo en el navegador).

## Opción A · Google Sheets

1. Crea una hoja de cálculo en Google Drive.
2. Abre **Extensiones → Apps Script**, borra el código y pega [`google_apps_script.gs`](google_apps_script.gs).
3. Cambia `PIN_ADMIN` y guarda.
4. **Implementar → Nueva implementación → Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Autoriza los permisos (Google avisa "app no verificada": *Configuración avanzada → Ir al proyecto*).
6. Copia la URL que termina en `/exec` y pégala en `SHEETS_URL` dentro de `index.html`.

La pestaña `boletas` se crea sola con las columnas `numero`, `estado`, `vendedor`, `comprador`, `precio`, `vendida_en` y `contacto`. Puedes editarla a mano: la app sincroniza cada pocos segundos.
Crear, ajustar, limpiar o reiniciar la rifa pide el PIN de administrador.

### Varias rifas

Cada rifa es una pestaña de la misma hoja. Toca el nombre de la rifa (arriba a la izquierda) y elige **＋ Nueva rifa…**; se crea una pestaña con ese nombre.
Cada rifa tiene su propio enlace para compartir: `https://<usuario>.github.io/<repositorio>/?rifa=Nombre%20de%20la%20rifa`.
Sin `?rifa=` se abre la rifa principal (`boletas`). Para borrar una rifa, elimina su pestaña en la hoja.

### Limpiar o reiniciar

En **Configurar**:
- **Limpiar ventas**: todas las boletas vuelven a estar libres; se conservan los números y el precio.
- **Reiniciar rifa**: borra todas las boletas para configurarla de nuevo.

> Si cambias el código del script: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar** (así la URL no cambia).

## Opción B · Supabase (tiempo real instantáneo)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor → New query**, pega [`supabase_setup.sql`](supabase_setup.sql) y pulsa **Run**.
3. En **Project Settings → API Keys**, copia el **Project URL** y la clave **publishable**.
4. En `index.html`, deja `SHEETS_URL` vacía y completa `API_URL` y `API_KEY`.
   ⚠️ Nunca uses la clave *secret* / *service_role*.

## Publicación con GitHub Pages

**Settings → Pages → Branch: `main` / `(root)` → Save**. La app queda en `https://<usuario>.github.io/<repositorio>/`.

## Seguridad

Cualquiera con el enlace puede registrar y anular ventas, y ver los datos de los compradores (incluido su contacto): compártelo solo con tus vendedores.
Con Google Sheets, las acciones de administración están protegidas por el PIN (que vive en el script, no en la página).
