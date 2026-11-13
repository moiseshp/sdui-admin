/**
 * Generates supabase/seed.sql. Run: `npm run seed:build`.
 *
 * The seed is written here (compact, with helpers) instead of by hand in SQL:
 * every product repeats the same TRACK_EVENT + NAVIGATE actions.
 *
 * "Ecommerce Default" is taken as-is from the contract's reference mock
 * (sdui-web/mocks/home-guest.json), so the backend starts by serving
 * exactly the screen the web client was built against.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const here = (path) => new URL(path, import.meta.url);
const guest = JSON.parse(readFileSync(here('../../sdui-web/mocks/home-guest.json'), 'utf8'));

/* Helpers ------------------------------------------------------------------ */

const IMG = 'https://delosi-pidelo.s3.amazonaws.com/kfc';
const img = {
  mega8: `${IMG}/products/mega-promo-8-piezas-202602160411187422.jpg`,
  mega10: `${IMG}/products/mega-promo-10-piezas-202602160411385589.jpg`,
  duoTwister: `${IMG}/products/duo-twister-xl-con-papas-202602160411547690.jpg`,
  share: `${IMG}/sections/para_compartir_delivery.jpg`,
  forTwo: `${IMG}/sections/para_2_delivery.jpg`,
  forYou: `${IMG}/sections/para_ti_delivery.jpg`,
  twister: `${IMG}/sections/twister_delivery.jpg`,
  bannerDipeo: `${IMG}/banners/mobile/dipeo.webp`,
  bannerCyber: `${IMG}/banners/MOBILE_CYB_20260420.png`,
  bannerKrushers: `${IMG}/banners/BANNER_LDHW_2_MOBILE.jpg`,
};
const LOGO = { imageUrl: 'https://www.kfc.com.pe/images/kfc/logo.svg', alt: 'KFC' };

const track = (name, params) => ({ type: 'TRACK_EVENT', payload: params ? { name, params } : { name } });
const showMessage = (title, message) => ({ type: 'SHOW_MESSAGE', payload: { title, message } });
const toProduct = (id) => ({ type: 'NAVIGATE', payload: { route: 'product_detail', params: { id } } });

const product = (id, name, description, priceLabel, imageUrl, extra = {}) => ({
  id,
  name,
  description,
  priceLabel,
  ...extra,
  imageUrl,
  actions: { onPress: [track('select_item', { item_id: id }), toProduct(id)] },
});

const headerButtons = [
  { icon: 'user', label: 'Mi cuenta', actions: { onPress: [track('header_click', { button: 'user' })] } },
  { icon: 'cart', label: 'Carrito', actions: { onPress: [track('header_click', { button: 'cart' }), showMessage('Tu carrito está vacío', 'Agrega un producto del menú para empezar tu pedido.')] } },
];

const cta = (label, promoId, productId) => ({
  label,
  actions: { onPress: [track('promo_cta_click', { promo_id: promoId }), ...(productId ? [toProduct(productId)] : [])] },
});

const onView = (list) => ({ onView: [track('section_view', { list })] });

/** One catalog row. */
const section = (id, name, slot, type, props, actions = null) => ({ id, name, slot, type, version: 1, props, actions });

const productList = (id, name, title, layout, items, extra = {}) =>
  section(id, name, 'body', 'product_list', { title, layout, items, ...extra }, onView(id));

/* Themes ------------------------------------------------------------------- */

const themes = [
  ['default', 'Default (rojo KFC)', '#d6001c', '#ffffff', '#ffc72c', '#1d1b1a'],
  ['loyalty', 'Loyalty (black)', '#1d1b1a', '#ffffff', '#c9a227', '#1d1b1a'],
  ['christmas', 'Navidad', '#0e6b3a', '#ffffff', '#d6001c', '#ffffff'],
  ['valentine', 'San Valentín', '#c2185b', '#ffffff', '#ffd6e4', '#7a0f3a'],
  ['rush', 'Rush (flash sale)', '#c2410c', '#ffffff', '#ffe600', '#1d1b1a'],
];

/* Catalog ------------------------------------------------------------------ */

const GUEST_NAMES = {
  guest_header: 'Header · Logo y accesos',
  guest_hero: 'Carrusel · Campañas principales',
  guest_most_chosen: 'Productos · Los combos más elegidos',
  guest_top: 'Productos · Lo más top del momento',
  guest_weekly_promos: 'Productos · Promociones de la semana',
  guest_offer: 'Promo · Oferta de la semana',
  bottom_bar_register: 'Barra · Crea tu cuenta',
};
const fromMock = (s, slot) => ({ ...s, name: GUEST_NAMES[s.id] ?? s.id, slot, actions: s.actions ?? null });

const sections = [
  /* Ecommerce Default: the reference mock ---------------------------------- */
  fromMock(guest.header, 'header'),
  ...guest.sections.map((s) => fromMock(s, 'body')),
  fromMock(guest.bottomBar, 'bottomBar'),

  /* San Valentín ----------------------------------------------------------- */
  section('valentine_header', 'Header · Saludo San Valentín', 'header', 'header_greeting', {
    title: 'Feliz San Valentín 💘',
    subtitle: 'El amor entra por el pollo',
    logo: LOGO,
    variant: 'brand',
    buttons: headerButtons,
  }),
  section('valentine_hero', 'Promo · Combo Enamorados', 'body', 'promo_banner', {
    title: 'Combo Enamorados',
    description: 'Para 2: 4 piezas + 2 papas + 2 bebidas + postre para compartir. Solo este 14 de febrero.',
    imageUrl: img.forTwo,
    badge: '14 DE FEBRERO',
    variant: 'brand',
    cta: cta('Pedir para dos', 'valentine_hero', 'val_001'),
  }),
  productList('valentine_for_two', 'Productos · Para compartir de a dos', 'Para compartir de a dos ❤️', 'grid', [
    product('val_001', 'Combo Enamorados', '4 piezas + 2 papas + 2 bebidas + postre', 'S/ 44.90', img.forTwo, {
      originalPriceLabel: 'S/ 54.90',
      badge: '2 ❤️',
    }),
    product('val_002', 'Dúo Twister XL', '2 Twister XL + 2 papas medianas', 'S/ 32.90', img.duoTwister, {
      originalPriceLabel: 'S/ 38.90',
      badge: 'DÚO',
    }),
    product('val_003', 'Mega para la cita', '8 piezas + papas familiares + bebida 1.5L', 'S/ 59.90', img.mega8),
    product('val_004', 'Cita en casa', '8 piezas + 2 papas familiares + bebida 1.5L', 'S/ 64.90', img.share, {
      badge: 'DELIVERY',
    }),
  ]),
  section('valentine_gift', 'Promo · Sorprende con delivery', 'body', 'promo_banner', {
    title: 'Sorpréndel@ en casa',
    description: 'Programa tu pedido y lo entregamos con una dedicatoria. Envío gratis en combos Para 2.',
    badge: 'ENVÍO GRATIS',
    variant: 'highlight',
    cta: cta('Programar pedido', 'valentine_gift'),
  }),
  productList('valentine_single', 'Productos · Solter@s, también hay amor', 'Solter@s: también hay amor propio 😎', 'carousel', [
    product('val_101', 'Para ti', '2 piezas de pollo + papas + bebida', 'S/ 18.90', img.forYou, { badge: 'SOLO' }),
    product('val_102', 'Twister XL', 'Twister XL + papas + bebida', 'S/ 21.90', img.twister),
    product('val_103', 'Mega solo para mí', '10 piezas. Nadie te juzga.', 'S/ 69.90', img.mega10, { badge: 'SIN CULPA' }),
  ]),
  section('valentine_bottom_bar', 'Barra · Envío gratis Para 2', 'bottomBar', 'bottom_bar', {
    title: 'Envío gratis en combos Para 2',
    message: 'Solo este 14 de febrero, en pedidos por delivery.',
    cta: { label: 'Ver combos', actions: { onPress: [track('valentine_bar_click')] } },
    variant: 'brand',
    icon: 'gift',
    isDismissible: true,
  }),

  /* Ecommerce Rush --------------------------------------------------------- */
  section('rush_header', 'Header · Rush (oscuro)', 'header', 'header_default', {
    logo: LOGO,
    variant: 'dark',
    buttons: headerButtons,
  }),
  section('rush_flash', 'Promo · Flash 50% por 2 horas', 'body', 'promo_banner', {
    title: '50% OFF por 2 horas',
    description: 'Mega 10 Piezas a mitad de precio. Empieza ahora y termina a las 2:00 pm.',
    imageUrl: img.mega10,
    badge: '⚡ FLASH RUSH',
    variant: 'highlight',
    cta: cta('Lo quiero ya', 'rush_flash', 'rush_001'),
  }),
  productList('rush_ending', 'Productos · Se acaban en minutos', 'Se acaban en minutos ⚡', 'grid', [
    product('rush_001', 'Mega 10 Piezas', '10 piezas de pollo + papas familiares', 'S/ 34.90', img.mega10, {
      originalPriceLabel: 'S/ 69.90',
      badge: '-50%',
    }),
    product('rush_002', 'Mega 8 Piezas', '8 piezas + papas familiares', 'S/ 35.90', img.mega8, {
      originalPriceLabel: 'S/ 59.90',
      badge: '-40%',
    }),
    product('rush_003', 'Dúo Twister XL', '2 Twister XL + 2 papas', 'S/ 23.90', img.duoTwister, {
      originalPriceLabel: 'S/ 38.90',
      badge: '-38%',
    }),
    product('rush_004', 'Para Compartir', '8 piezas + 2 papas + bebida 1.5L', 'S/ 45.90', img.share, {
      originalPriceLabel: 'S/ 64.90',
      badge: '-30%',
    }),
  ]),
  section('rush_2x1', 'Promo · 2x1 en Twister XL', 'body', 'promo_banner', {
    title: '2x1 en Twister XL',
    description: 'Pide uno y llévate dos. Hasta agotar stock.',
    imageUrl: img.twister,
    badge: 'ÚLTIMAS UNIDADES',
    variant: 'dark',
    cta: cta('Aprovechar 2x1', 'rush_2x1', 'rush_101'),
  }),
  productList('rush_under_20', 'Productos · Todo a menos de S/ 20', 'Todo a menos de S/ 20 💸', 'carousel', [
    product('rush_101', 'Twister XL 2x1', '2 Twister XL al precio de uno', 'S/ 19.90', img.twister, { badge: '2x1' }),
    product('rush_102', 'Para ti', '2 piezas + papas + bebida', 'S/ 14.90', img.forYou, {
      originalPriceLabel: 'S/ 18.90',
      badge: '-20%',
    }),
    product('rush_103', 'Para 2 express', '4 piezas + 2 papas', 'S/ 19.90', img.forTwo, {
      originalPriceLabel: 'S/ 29.90',
      badge: '-33%',
    }),
  ]),
  section('rush_bottom_bar', 'Barra · La promo termina hoy', 'bottomBar', 'bottom_bar', {
    title: 'El Rush termina a las 2:00 pm',
    message: 'Los precios vuelven a la normalidad al terminar.',
    cta: { label: 'Ver ofertas', actions: { onPress: [track('rush_bar_click')] } },
    variant: 'warning',
    icon: 'bell',
    isDismissible: false,
  }),

  /* Noche de Partido ------------------------------------------------------- */
  section('match_header', 'Header · Saludo Noche de Partido', 'header', 'header_greeting', {
    title: '¡Hoy se juega! ⚽',
    subtitle: 'Arma la previa sin salir de casa',
    logo: LOGO,
    variant: 'brand',
    buttons: headerButtons,
  }),
  section('match_hero', 'Promo · Combo Hinchada', 'body', 'promo_banner', {
    title: 'Combo Hinchada',
    description: '15 piezas + 3 papas familiares + 2 bebidas 1.5L. Para ver el partido con toda la gente.',
    imageUrl: img.share,
    badge: 'NOCHE DE PARTIDO',
    variant: 'brand',
    cta: cta('Pedir para la previa', 'match_hero', 'match_001'),
  }),
  productList('match_groups', 'Productos · Para toda la hinchada', 'Para toda la hinchada 🙌', 'carousel', [
    product('match_001', 'Combo Hinchada', '15 piezas + 3 papas + 2 bebidas 1.5L', 'S/ 99.90', img.share, {
      originalPriceLabel: 'S/ 119.90',
      badge: 'x6',
    }),
    product('match_002', 'Mega 10 Piezas', '10 piezas + papas familiares', 'S/ 69.90', img.mega10, { badge: 'x4' }),
    product('match_003', 'Mega 8 Piezas', '8 piezas + papas familiares', 'S/ 59.90', img.mega8, { badge: 'x3' }),
  ]),
  productList('match_snacks', 'Productos · Piqueos para el entretiempo', 'Piqueos para el entretiempo 🍗', 'grid', [
    product('match_101', 'Twister XL', 'Para comer sin soltar el control', 'S/ 21.90', img.twister),
    product('match_102', 'Dúo Twister XL', '2 Twister XL + 2 papas', 'S/ 32.90', img.duoTwister),
  ]),
  section('match_bottom_bar', 'Barra · Pide antes del pitazo', 'bottomBar', 'bottom_bar', {
    title: 'Pide antes del pitazo inicial',
    message: 'Los pedidos después de las 7:00 pm pueden demorar más.',
    variant: 'dark',
    icon: 'bell',
    isDismissible: true,
  }),

  /* Spare sections: not in any layout, to try "Agregar sección" ------------ */
  section('spare_today_only', 'Promo · Solo por hoy', 'body', 'promo_banner', {
    title: 'Solo por hoy',
    description: 'Mega 8 Piezas a S/ 59.90. Válido hasta las 11:59 pm.',
    imageUrl: img.mega8,
    badge: 'SOLO HOY',
    variant: 'dark',
    cta: cta('Ver oferta', 'spare_today_only', 'prod_001'),
  }),
  section('spare_app_download', 'Promo · Descarga la app', 'body', 'promo_banner', {
    title: 'Pide más rápido desde la app',
    description: 'Guarda tus direcciones y repite tu pedido favorito en dos toques.',
    badge: 'NUEVO',
    variant: 'highlight',
    cta: cta('Descargar', 'spare_app_download'),
  }),
  section('spare_hero_duo', 'Carrusel · Dos campañas (peek)', 'body', 'hero_carousel', {
    items: [
      { imageUrl: img.bannerCyber, alt: 'Big Box - La caja que lo tiene todo', actions: { onPress: [track('hero_click', { position: 1 })] } },
      { imageUrl: img.bannerKrushers, alt: 'Nuevos Krushers - Refréscate', actions: { onPress: [track('hero_click', { position: 2 })] } },
    ],
    layout: 'peek',
    autoplay: false,
  }),
  productList('spare_solo', 'Productos · Antojos individuales', 'Antojos solo para ti 😋', 'carousel', [
    product('solo_001', 'Para ti', '2 piezas de pollo + papas + bebida', 'S/ 18.90', img.forYou),
    product('solo_002', 'Twister XL', 'Twister XL + papas + bebida', 'S/ 21.90', img.twister),
    product('solo_003', 'Chicken Strips x6', '6 strips crocantes + salsa', 'S/ 29.90', img.mega10),
  ]),
  section('spare_bottom_bar_address', 'Barra · Agrega tu dirección', 'bottomBar', 'bottom_bar', {
    title: '¿Dónde te llevamos tu pedido?',
    message: 'Agrega tu dirección para ver precios y tiempos de tu zona.',
    cta: { label: 'Agregar', actions: { onPress: [track('address_cta_click')] } },
    variant: 'dark',
    icon: 'map_pin',
    isDismissible: true,
  }),
];

/* Layouts ------------------------------------------------------------------ */

const layouts = [
  {
    id: 'ecommerce_default',
    name: 'Ecommerce Default',
    description: 'El home de siempre: campañas, los más vendidos y la oferta de la semana.',
    theme: 'default',
    header: 'guest_header',
    body: guest.sections.map((s) => s.id),
    bottomBar: 'bottom_bar_register',
  },
  {
    id: 'san_valentin',
    name: 'San Valentín',
    description: 'Campaña del 14 de febrero: combos para dos, con su propio wording y color.',
    theme: 'valentine',
    header: 'valentine_header',
    body: ['valentine_hero', 'valentine_for_two', 'valentine_gift', 'valentine_single'],
    bottomBar: 'valentine_bottom_bar',
  },
  {
    id: 'ecommerce_rush',
    name: 'Ecommerce Rush',
    description: 'Flash sale: descuentos agresivos por tiempo limitado y sensación de urgencia.',
    theme: 'rush',
    header: 'rush_header',
    body: ['rush_flash', 'rush_ending', 'rush_2x1', 'rush_under_20'],
    bottomBar: 'rush_bottom_bar',
  },
  {
    id: 'match_day',
    name: 'Noche de Partido',
    description: 'Día de partido: combos grandes para grupos y piqueos. Mismo color de marca, otra pantalla.',
    theme: 'default',
    header: 'match_header',
    body: ['match_hero', 'match_groups', 'match_snacks'],
    bottomBar: 'match_bottom_bar',
  },
];

/* SQL ---------------------------------------------------------------------- */

const text = (value) => (value === null || value === undefined ? 'null' : `'${String(value).replaceAll("'", "''")}'`);
const json = (value) => (value === null || value === undefined ? 'null' : `$json$${JSON.stringify(value)}$json$::jsonb`);
const rows = (list) => list.map((r) => `  (${r.join(', ')})`).join(',\n');

const ids = new Set();
for (const s of sections) {
  if (ids.has(s.id)) throw new Error(`Duplicate section id: ${s.id}`);
  ids.add(s.id);
}
for (const l of layouts) {
  for (const id of [l.header, l.bottomBar, ...l.body]) {
    if (!ids.has(id)) throw new Error(`Layout ${l.id} uses unknown section ${id}`);
  }
}

const sql = `-- GENERATED by supabase/build-seed.mjs. Do not edit by hand: run \`npm run seed:build\`.
--
-- Resets the demo: wipes the SDUI tables and loads themes, the section catalog,
-- the layouts and the home screen with "Ecommerce Default" live.
-- Run it after migrations/0001_sdui_schema.sql. Safe to re-run.

begin;

truncate public.sdui_layout_sections, public.sdui_layouts, public.sdui_screen_configs,
         public.sdui_sections, public.sdui_themes cascade;

insert into public.sdui_themes (id, name, brand, on_brand, highlight, on_highlight, position) values
${rows(themes.map((t, i) => [...t.map(text), i + 1]))};

insert into public.sdui_sections (id, name, slot, type, version, props, actions) values
${rows(sections.map((s) => [text(s.id), text(s.name), text(s.slot), text(s.type), s.version ?? 1, json(s.props ?? {}), json(s.actions)]))};

insert into public.sdui_screen_configs (screen_id, name, schema_version, meta_title, actions) values
  (${[text(guest.screenId), text('Home'), text(guest.schemaVersion), text(guest.meta.title), json(guest.actions)].join(', ')});

insert into public.sdui_layouts (id, screen_id, name, description, theme_id, header_section_id, bottom_bar_section_id, position) values
${rows(layouts.map((l, i) => [text(l.id), text(guest.screenId), text(l.name), text(l.description), text(l.theme), text(l.header), text(l.bottomBar), i + 1]))};

insert into public.sdui_layout_sections (layout_id, section_id, position) values
${rows(layouts.flatMap((l) => l.body.map((id, i) => [text(l.id), text(id), i + 1])))};

update public.sdui_screen_configs set active_layout_id = ${text(layouts[0].id)} where screen_id = ${text(guest.screenId)};

commit;
`;

writeFileSync(here('./seed.sql'), sql);
console.log(`seed.sql: ${themes.length} themes, ${sections.length} sections, ${layouts.length} layouts`);
