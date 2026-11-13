/**
 * Finds the texts of a section that can be edited from the manager.
 *
 * Generic on purpose: it walks `props` instead of knowing each section type,
 * so a new section in the catalog gets its form for free. Everything that is
 * not copy is left out: actions, URLs and the semantic enums (variant, layout,
 * icon), which the manager does not change.
 */

export type Path = (string | number)[];

export type TextField = {
  key: string;
  path: Path;
  label: string;
  group: string;
  value: string;
  required: boolean;
  multiline: boolean;
};

const SKIPPED_KEYS = new Set(['actions', 'logo', 'imageUrl', 'variant', 'layout', 'icon', 'id', 'url', 'route']);
/** Required by the catalog's schemas: an empty one would make the client skip the section. */
const REQUIRED_KEYS = new Set(['title', 'name', 'label', 'priceLabel', 'alt', 'message', 'code', 'validUntilLabel', 'tierLabel', 'pointsLabel', 'daypartLabel']);
const MULTILINE_KEYS = new Set(['description', 'message']);

const LABELS: Record<string, string> = {
  title: 'Título',
  subtitle: 'Subtítulo',
  description: 'Descripción',
  message: 'Mensaje',
  badge: 'Etiqueta',
  label: 'Texto del botón',
  name: 'Nombre',
  priceLabel: 'Precio',
  originalPriceLabel: 'Precio anterior',
  alt: 'Texto alternativo',
};

const FIELD_ORDER = ['title', 'subtitle', 'name', 'description', 'message', 'badge', 'priceLabel', 'originalPriceLabel', 'label', 'alt'];

const GROUPS: Record<string, string> = { cta: 'Botón', buttons: 'Botones del header', items: 'Ítems' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function collectTextFields(props: Record<string, unknown>): TextField[] {
  const fields: TextField[] = [];

  const walk = (value: unknown, path: Path, group: string) => {
    if (typeof value === 'string') {
      const key = String(path[path.length - 1]);
      fields.push({
        key: path.join('.'),
        path,
        label: LABELS[key] ?? key,
        group,
        value,
        required: REQUIRED_KEYS.has(key),
        multiline: MULTILINE_KEYS.has(key),
      });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const name = isRecord(item) && typeof (item.name ?? item.label ?? item.alt) === 'string' ? (item.name ?? item.label ?? item.alt) : '';
        walk(item, [...path, index], `${group} · ${index + 1}${name ? ` · ${name}` : ''}`);
      });
    } else if (isRecord(value)) {
      for (const [key, child] of Object.entries(value)) {
        if (SKIPPED_KEYS.has(key)) continue;
        const isContainer = typeof child === 'object' && child !== null;
        walk(child, [...path, key], isContainer && path.length === 0 ? (GROUPS[key] ?? key) : group);
      }
    }
  };

  walk(props, [], 'Sección');

  // Postgres does not keep the key order of a jsonb, so the form sets its own:
  // the section's texts first, and inside each group the most visible text first.
  const groupOrder = [...new Set(fields.map((f) => f.group))].sort((a, b) => Number(b === 'Sección') - Number(a === 'Sección'));
  const rank = (field: TextField) => {
    const index = FIELD_ORDER.indexOf(String(field.path[field.path.length - 1]));
    return index === -1 ? FIELD_ORDER.length : index;
  };
  return fields.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group) || rank(a) - rank(b));
}

/** A copy of `props` with the texts in `values` (keyed by TextField.key) applied. */
export function applyTextFields(props: Record<string, unknown>, fields: TextField[], values: Record<string, string>): Record<string, unknown> {
  const next = structuredClone(props);
  for (const field of fields) {
    if (!(field.key in values)) continue;
    let target: unknown = next;
    for (const step of field.path.slice(0, -1)) target = (target as Record<string | number, unknown>)[step];
    (target as Record<string | number, unknown>)[field.path[field.path.length - 1]] = values[field.key];
  }
  return next;
}

/** The text that best identifies a section in a list. */
export function sectionHeadline(props: Record<string, unknown>): string | null {
  for (const key of ['title', 'message']) {
    if (typeof props[key] === 'string' && props[key]) return props[key] as string;
  }
  if (Array.isArray(props.items)) return `${props.items.length} ítems`;
  return null;
}
