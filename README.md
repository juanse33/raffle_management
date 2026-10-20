# Gestor de Rifas

Aplicación web de un solo archivo (`index.html`) para gestionar una rifa: tablero de números, registro de ventas por vendedor y total recaudado en tiempo real. Usa [Supabase](https://supabase.com) como base de datos en la nube y no necesita servidor ni Node.js.

Sin credenciales funciona en **modo demo** (los datos se guardan solo en el navegador).

## Configuración

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **SQL Editor → New query**, pega el contenido de [`supabase_setup.sql`](supabase_setup.sql) y pulsa **Run**.
3. En **Project Settings → API Keys**, copia el **Project URL** y la clave **publishable** (o *anon public*).
4. En `index.html`, reemplaza los valores de `API_URL` y `API_KEY`.
   ⚠️ Nunca uses la clave *secret* / *service_role*.

## Publicación con GitHub Pages

En el repositorio: **Settings → Pages → Branch: `main` / `(root)` → Save**. En uno o dos minutos la app queda disponible en `https://<usuario>.github.io/<repositorio>/`.

## Seguridad

La clave pública queda visible en la página: cualquiera con el enlace puede registrar, anular o reiniciar la rifa. Comparte el enlace solo con tu equipo de vendedores.
