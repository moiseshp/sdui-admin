'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Section } from '@/lib/types';
import { sectionHeadline } from '@/lib/wording';

type Props = {
  open: boolean;
  /** Set when the pick replaces a section instead of adding one. */
  replacing: Section | null;
  /** Catalog sections that can go in the body and are not in the layout yet. */
  options: Section[];
  onPick: (section: Section) => void;
  onClose: () => void;
};

/** Sections are never created here: they are picked from the catalog in the database. */
export function SectionPickerDialog({ open, replacing, options, onPick, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{replacing ? 'Cambiar sección' : 'Agregar sección'}</DialogTitle>
          <DialogDescription>
            {replacing ? `Elige la sección que ocupará el lugar de «${replacing.name}».` : 'Elige una sección del catálogo. Se agrega al final de la vista.'}
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Todas las secciones del catálogo ya están en esta vista.</p>
        ) : (
          <ul className="-mx-1 max-h-[60vh] space-y-1 overflow-y-auto px-1">
            {options.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => onPick(section)}
                  className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{section.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{sectionHeadline(section.props) ?? section.id}</span>
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {section.type}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
