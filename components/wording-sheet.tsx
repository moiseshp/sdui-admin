'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { Section } from '@/lib/types';
import { applyTextFields, collectTextFields } from '@/lib/wording';

type Props = {
  /** The section being edited; `null` closes the sheet. */
  section: Section | null;
  /** How many layouts use it: a wording change reaches all of them. */
  usedBy: string[];
  onClose: () => void;
  onSave: (section: Section, props: Record<string, unknown>) => Promise<boolean>;
};

export function WordingSheet({ section, usedBy, onClose, onSave }: Props) {
  return (
    <Sheet open={section !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 data-[side=right]:sm:max-w-md">
        {/* Keyed by section: the form state starts fresh for each one. */}
        {section && <WordingForm key={section.id} section={section} usedBy={usedBy} onClose={onClose} onSave={onSave} />}
      </SheetContent>
    </Sheet>
  );
}

function WordingForm({ section, usedBy, onClose, onSave }: Props & { section: Section }) {
  const fields = useMemo(() => collectTextFields(section.props), [section.props]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const valueOf = (key: string, original: string) => values[key] ?? original;
  const changed = fields.filter((f) => valueOf(f.key, f.value) !== f.value);
  const invalid = fields.some((f) => f.required && valueOf(f.key, f.value).trim() === '');

  const groups = useMemo(() => {
    const byGroup = new Map<string, typeof fields>();
    for (const field of fields) byGroup.set(field.group, [...(byGroup.get(field.group) ?? []), field]);
    return [...byGroup.entries()];
  }, [fields]);

  async function save() {
    setSaving(true);
    const ok = await onSave(section, applyTextFields(section.props, fields, values));
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Editar textos</SheetTitle>
        <SheetDescription>
          {section.name} · <code className="font-mono text-xs">{section.type}</code>
        </SheetDescription>
      </SheetHeader>

      <form
        id="wording-form"
        className="flex-1 space-y-6 overflow-y-auto p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {fields.length === 0 && <p className="text-sm text-muted-foreground">Esta sección no tiene textos editables.</p>}
        {groups.map(([group, groupFields]) => (
          <fieldset key={group} className="space-y-3">
            <legend className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{group}</legend>
            {groupFields.map((field) => {
              const value = valueOf(field.key, field.value);
              const isEmpty = field.required && value.trim() === '';
              const common = {
                id: `field-${field.key}`,
                value,
                'aria-invalid': isEmpty || undefined,
                onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value })),
              };
              return (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={common.id}>{field.label}</Label>
                  {field.multiline ? <Textarea rows={3} {...common} /> : <Input {...common} />}
                  {isEmpty && <p className="text-xs text-destructive">Obligatorio: el cliente omite la sección si llega vacío.</p>}
                </div>
              );
            })}
          </fieldset>
        ))}
      </form>

      <SheetFooter className="border-t">
        {usedBy.length > 1 && (
          <p className="text-xs text-muted-foreground">El texto es de la sección: cambia en {usedBy.join(', ')}.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="wording-form" disabled={saving || invalid || changed.length === 0}>
            {saving ? 'Guardando…' : 'Guardar textos'}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
