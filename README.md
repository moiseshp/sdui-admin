# SDUI Admin

Gestor de las pantallas SDUI. Edita en Supabase lo mismo que el cliente (`sdui-web`) lee: al recargar el cliente, el cambio se ve. No hay realtime ni paso de «publicar»: cada cambio se guarda al momento.

Next.js 16 · shadcn/ui (Base UI) · Tailwind 4 · Supabase · dnd-kit.

## Qué se puede hacer

| Acción | Dónde queda |
|---|---|
| Activar una vista (la que reciben los clientes) | `sdui_screen_configs.active_layout_id` |
| Cambiar el color de una vista, sin tocar sus secciones | `sdui_layouts.theme_id` |
| Reordenar, agregar, cambiar o quitar secciones del cuerpo | `sdui_layout_sections` (vía `sdui_set_layout_sections`) |
| Cambiar el header o la barra inferior | `sdui_layouts.header_section_id` / `bottom_bar_section_id` |
| Editar los textos de una sección | `sdui_sections.props` |

Las secciones no se crean desde el gestor: vienen del catálogo en la base (`sdui_sections`). El texto es de la sección, así que si dos vistas la comparten, cambia en ambas.

El panel de la derecha muestra el JSON que el backend arma para la vista seleccionada (`sdui_layout_payload`), esté en vivo o no.

## Puesta en marcha

Requiere Node 22.

1. En el SQL Editor de Supabase ejecuta, en orden:
   - `supabase/migrations/0001_sdui_schema.sql` (tablas, la vista `sdui_screens` y funciones)
   - `supabase/seed.sql` (temas, catálogo de secciones y vistas; deja «Ecommerce Default» en vivo)
2. Copia `.env.example` a `.env.local` y completa `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Son las mismas de `sdui-web`.
3. `npm install` y `npm run dev` → http://localhost:3001 (el cliente web usa el 3000).

Para volver al estado inicial de la demo, ejecuta de nuevo `supabase/seed.sql`.

**Demo, sin seguridad:** las tablas no tienen RLS y el gestor no pide login. Cualquiera con la URL y la llave publicable puede editar.

## Modelo de datos

```
sdui_screen_configs ──active_layout_id──▶ sdui_layouts ──theme_id──▶ sdui_themes
                                            │  ├─ header_section_id ─────┐
                                            │  └─ bottom_bar_section_id ─┤
                                            └─ sdui_layout_sections ─────┴▶ sdui_sections
                                               (cuerpo, con posición)        (catálogo + wording)

sdui_screens (vista)  =  screen_id + payload de la vista en vivo   ← lo que lee el cliente
```

Una **vista** (`sdui_layouts`) es una lista propia de secciones. Un **tema** (`sdui_themes`) es solo color: viaja como `screen.theme` y cada cliente lo traduce a sus tokens; los colores guardados en la tabla son solo para las muestras del gestor.

## Vistas del seed

| Vista | Tema | Idea |
|---|---|---|
| Ecommerce Default | `default` | Idéntica al mock de referencia `docs/mocks/examples/home-guest.json` |
| San Valentín | `valentine` | Campaña del 14 de febrero, con sus secciones y wording |
| Ecommerce Rush | `rush` | Flash sale: descuentos agresivos y urgencia |
| Noche de Partido | `default` | Combos para grupos; mismo color de marca, otra pantalla |

El catálogo trae además secciones `spare_*` que no están en ninguna vista, para probar «Agregar sección».

Agregar un tema nuevo son tres pasos: una fila en `sdui_themes`, sus tokens en `sdui-web/sections/shared/theme.css` y su id en `ThemeSchema` (`sdui-web/lib/sdui/contract/screen.ts`). Un cliente que no conoce el tema lo pinta con el tema por defecto.

## Editar el seed

`supabase/seed.sql` se genera: edita `supabase/build-seed.mjs` y ejecuta `npm run seed:build`.

## Estructura

| Ruta | Qué es |
|---|---|
| `app/page.tsx` | Lista de pantallas |
| `app/screens/[screenId]/page.tsx` | Carga los datos de una pantalla |
| `app/actions.ts` | Todas las escrituras (Server Functions) |
| `components/screen-manager.tsx` | El gestor: vistas, editor y JSON |
| `components/wording-sheet.tsx` | Formulario de textos de una sección |
| `lib/wording.ts` | Encuentra los textos editables en los `props` |
| `lib/data.ts`, `lib/supabase.ts` | Lecturas y cliente de Supabase (solo servidor) |
| `supabase/` | Esquema, seed y su generador |
