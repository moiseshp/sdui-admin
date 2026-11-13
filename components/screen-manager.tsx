'use client';

/**
 * The manager of one screen: pick a layout, edit it, make it live.
 *
 * Every change is saved right away (no "publish" step): the client is not
 * realtime, it shows the change on its next reload. The local state is updated
 * first and rolled back if the database rejects the change.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@/lib/dnd';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, ChevronLeft, Copy, Plus, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { activateLayout, getLayoutPayload, setLayoutSections, setLayoutSlot, setLayoutTheme, updateSectionProps } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ActionResult, AdminData, Layout, Section } from '@/lib/types';
import { SectionPickerDialog } from './section-picker-dialog';
import { SortableSectionRow } from './section-row';
import { ThemeSwatch } from './theme-swatch';
import { WordingSheet } from './wording-sheet';

type Picker = { open: false } | { open: true; replacing: Section | null };

export function ScreenManager({ initial }: { initial: AdminData }) {
  const { screen, themes } = initial;
  const [layouts, setLayouts] = useState(initial.layouts);
  const [sections, setSections] = useState(initial.sections);
  const [activeLayoutId, setActiveLayoutId] = useState(screen.active_layout_id);
  const [selectedId, setSelectedId] = useState(screen.active_layout_id ?? initial.layouts[0]?.id ?? null);
  const [editing, setEditing] = useState<Section | null>(null);
  const [picker, setPicker] = useState<Picker>({ open: false });
  /** Bumped after each save, so the payload preview is read again. */
  const [revision, setRevision] = useState(0);

  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const layout = layouts.find((l) => l.id === selectedId) ?? null;

  /** Optimistic update: apply locally, save, roll back on error. */
  async function save(apply: () => void, request: () => Promise<ActionResult>, message: string): Promise<boolean> {
    const snapshot = { layouts, sections, activeLayoutId };
    apply();
    let result: ActionResult;
    try {
      result = await request();
    } catch {
      result = { ok: false, error: 'No se pudo conectar con el servidor.' };
    }
    if (!result.ok) {
      setLayouts(snapshot.layouts);
      setSections(snapshot.sections);
      setActiveLayoutId(snapshot.activeLayoutId);
      toast.error('No se guardó el cambio', { description: result.error });
      return false;
    }
    setRevision((r) => r + 1);
    toast.success(message);
    return true;
  }

  const patchLayout = (id: string, patch: Partial<Layout>) => setLayouts((all) => all.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  function changeBody(target: Layout, sectionIds: string[], message: string) {
    return save(
      () => patchLayout(target.id, { section_ids: sectionIds }),
      () => setLayoutSections(target.id, sectionIds),
      message,
    );
  }

  if (!layout) {
    return <p className="text-sm text-muted-foreground">Esta pantalla no tiene vistas: falta ejecutar supabase/seed.sql.</p>;
  }

  const isLive = layout.id === activeLayoutId;
  const body = layout.section_ids.map((id) => sectionById.get(id)).filter((s): s is Section => Boolean(s));
  const usedIds = new Set(layout.section_ids);
  const pickable = sections.filter((s) => s.slot === 'body' && !usedIds.has(s.id));
  const usedBy = editing
    ? layouts
        .filter((l) => l.header_section_id === editing.id || l.bottom_bar_section_id === editing.id || l.section_ids.includes(editing.id))
        .map((l) => l.name)
    : [];

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/" aria-label="Volver a pantallas" className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
          <ChevronLeft />
        </Link>
        <h1 className="text-xl font-semibold">{screen.name}</h1>
        <code className="font-mono text-xs text-muted-foreground">{screen.screen_id}</code>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_26rem]">
        {/* Layouts ---------------------------------------------------------- */}
        <section aria-labelledby="layouts-title">
          <h2 id="layouts-title" className="mb-2 text-sm font-medium text-muted-foreground">
            Vistas
          </h2>
          <ul className="space-y-2">
            {layouts.map((item) => {
              const theme = themes.find((t) => t.id === item.theme_id);
              const live = item.id === activeLayoutId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    aria-pressed={item.id === layout.id}
                    className={cn(
                      'w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                      item.id === layout.id && 'border-foreground ring-1 ring-foreground',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                      {live && (
                        <Badge className="bg-emerald-600 text-white">
                          <Radio /> En vivo
                        </Badge>
                      )}
                    </span>
                    <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</span>
                    <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {theme && <ThemeSwatch theme={theme} />}
                      {theme?.name ?? item.theme_id} · {item.section_ids.length} secciones
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Editor ----------------------------------------------------------- */}
        <section aria-labelledby="editor-title" className="rounded-xl border bg-background p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="editor-title" className="font-semibold">
                {layout.name}
              </h2>
              <p className="text-sm text-muted-foreground">{layout.description}</p>
            </div>
            {isLive ? (
              <Badge className="h-8 bg-emerald-600 px-3 text-sm text-white">
                <Check /> En vivo
              </Badge>
            ) : (
              <Button
                onClick={() =>
                  save(
                    () => setActiveLayoutId(layout.id),
                    () => activateLayout(screen.screen_id, layout.id),
                    `«${layout.name}» está en vivo`,
                  )
                }
              >
                <Radio /> Activar esta vista
              </Button>
            )}
          </div>

          <Field label="Color" hint="Variante de color. No cambia las secciones ni los textos.">
            <Select
              items={themes.map((t) => ({ value: t.id, label: t.name }))}
              value={layout.theme_id}
              onValueChange={(themeId) => {
                if (!themeId || themeId === layout.theme_id) return;
                void save(
                  () => patchLayout(layout.id, { theme_id: themeId }),
                  () => setLayoutTheme(layout.id, themeId),
                  'Color actualizado',
                );
              }}
            >
              <SelectTrigger className="w-full sm:w-72" aria-label="Color">
                <SelectValue>
                  {(value: string) => {
                    const theme = themes.find((t) => t.id === value);
                    return theme ? (
                      <>
                        <ThemeSwatch theme={theme} /> {theme.name}
                      </>
                    ) : (
                      value
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {themes.map((theme) => (
                  <SelectItem key={theme.id} value={theme.id}>
                    <ThemeSwatch theme={theme} /> {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <SlotField
            label="Header"
            hint="Fijo arriba."
            emptyLabel="Sin header"
            options={sections.filter((s) => s.slot === 'header')}
            section={layout.header_section_id ? (sectionById.get(layout.header_section_id) ?? null) : null}
            onChange={(sectionId) =>
              save(
                () => patchLayout(layout.id, { header_section_id: sectionId }),
                () => setLayoutSlot(layout.id, 'header', sectionId),
                'Header actualizado',
              )
            }
            onEdit={setEditing}
          />

          <Field label="Secciones" hint="Arrastra para ordenar. El orden de la lista es el orden en pantalla.">
            <SortableBody
              sections={body}
              onReorder={(ids) => changeBody(layout, ids, 'Orden actualizado')}
              onEdit={setEditing}
              onReplace={(section) => setPicker({ open: true, replacing: section })}
              onRemove={(section) =>
                changeBody(
                  layout,
                  layout.section_ids.filter((id) => id !== section.id),
                  `Se quitó «${section.name}»`,
                )
              }
            />
            <Button variant="outline" className="mt-2 w-full border-dashed" onClick={() => setPicker({ open: true, replacing: null })}>
              <Plus /> Agregar sección
            </Button>
          </Field>

          <SlotField
            label="Barra inferior"
            hint="Fija abajo."
            emptyLabel="Sin barra inferior"
            options={sections.filter((s) => s.slot === 'bottomBar')}
            section={layout.bottom_bar_section_id ? (sectionById.get(layout.bottom_bar_section_id) ?? null) : null}
            onChange={(sectionId) =>
              save(
                () => patchLayout(layout.id, { bottom_bar_section_id: sectionId }),
                () => setLayoutSlot(layout.id, 'bottomBar', sectionId),
                'Barra inferior actualizada',
              )
            }
            onEdit={setEditing}
          />
        </section>

        {/* Payload ---------------------------------------------------------- */}
        <PayloadPreview key={layout.id} layoutId={layout.id} isLive={isLive} revision={revision} />
      </div>

      <WordingSheet
        section={editing}
        usedBy={usedBy}
        onClose={() => setEditing(null)}
        onSave={(section, props) =>
          save(
            () => setSections((all) => all.map((s) => (s.id === section.id ? { ...s, props } : s))),
            () => updateSectionProps(section.id, props),
            'Textos guardados',
          )
        }
      />

      <SectionPickerDialog
        open={picker.open}
        replacing={picker.open ? picker.replacing : null}
        options={pickable}
        onClose={() => setPicker({ open: false })}
        onPick={(picked) => {
          const replacing = picker.open ? picker.replacing : null;
          setPicker({ open: false });
          void changeBody(
            layout,
            replacing ? layout.section_ids.map((id) => (id === replacing.id ? picked.id : id)) : [...layout.section_ids, picked.id],
            replacing ? `«${picked.name}» reemplazó a «${replacing.name}»` : `Se agregó «${picked.name}»`,
          );
        }}
      />
    </div>
  );
}

/* Pieces ------------------------------------------------------------------- */

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-sm font-medium">{label}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

const NONE = '__none__';

/** A fixed slot (header / bottom bar): one section from the catalog, or none. */
function SlotField({
  label,
  hint,
  emptyLabel,
  options,
  section,
  onChange,
  onEdit,
}: {
  label: string;
  hint: string;
  emptyLabel: string;
  options: Section[];
  section: Section | null;
  onChange: (sectionId: string | null) => void;
  onEdit: (section: Section) => void;
}) {
  const items = [{ value: NONE, label: emptyLabel }, ...options.map((s) => ({ value: s.id, label: s.name }))];
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={items}
          value={section?.id ?? NONE}
          onValueChange={(value) => {
            const next = !value || value === NONE ? null : value;
            if (next !== (section?.id ?? null)) onChange(next);
          }}
        >
          <SelectTrigger className="min-w-0 flex-1" aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {section && (
          <Button variant="outline" onClick={() => onEdit(section)}>
            Editar textos
          </Button>
        )}
      </div>
    </Field>
  );
}

function SortableBody({
  sections,
  onReorder,
  onEdit,
  onReplace,
  onRemove,
}: {
  sections: Section[];
  onReorder: (sectionIds: string[]) => void;
  onEdit: (section: Section) => void;
  onReplace: (section: Section) => void;
  onRemove: (section: Section) => void;
}) {
  const dndId = useId(); // Stable between server and client render.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = sections.map((s) => s.id);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  }

  if (sections.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Esta vista no tiene secciones.</p>;
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {sections.map((section) => (
            <SortableSectionRow
              key={section.id}
              section={section}
              onEdit={() => onEdit(section)}
              onReplace={() => onReplace(section)}
              onRemove={() => onRemove(section)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/** The Screen JSON the backend builds for this layout: what a client would receive. */
function PayloadPreview({ layoutId, isLive, revision }: { layoutId: string; isLive: boolean; revision: number }) {
  const [state, setState] = useState<{ json: string | null; error: string | null }>({ json: null, error: null });

  useEffect(() => {
    let cancelled = false;
    getLayoutPayload(layoutId)
      .then((result) => {
        if (cancelled) return;
        setState(result.ok ? { json: JSON.stringify(result.data, null, 2), error: null } : { json: null, error: result.error });
      })
      .catch(() => !cancelled && setState({ json: null, error: 'No se pudo conectar con el servidor.' }));
    return () => {
      cancelled = true;
    };
  }, [layoutId, revision]);

  return (
    <section aria-labelledby="payload-title" className="lg:col-span-2 xl:sticky xl:top-18 xl:col-span-1">
      <div className="mb-2 flex items-center gap-2">
        <h2 id="payload-title" className="flex-1 text-sm font-medium text-muted-foreground">
          {isLive ? 'JSON que recibe el cliente' : 'JSON de esta vista (no está en vivo)'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={!state.json}
          onClick={() => {
            if (!state.json) return;
            void navigator.clipboard.writeText(state.json).then(() => toast.success('JSON copiado'));
          }}
        >
          <Copy /> Copiar
        </Button>
      </div>
      <pre className="max-h-[calc(100dvh-9rem)] overflow-auto rounded-xl border bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100">
        {state.error ? <span className="text-red-300">{state.error}</span> : (state.json ?? 'Cargando…')}
      </pre>
    </section>
  );
}
