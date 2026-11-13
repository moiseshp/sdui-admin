'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeftRight, GripVertical, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Section } from '@/lib/types';
import { sectionHeadline } from '@/lib/wording';

type RowProps = {
  section: Section;
  onEdit: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
  /** Drag handle, only for the sortable body. */
  handle?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLLIElement>;
};

export function SectionRow({ section, onEdit, onReplace, onRemove, handle, className, style, ref }: RowProps) {
  return (
    <li ref={ref} style={style} className={cn('flex items-center gap-2 rounded-lg border bg-card py-2 pr-2 pl-1', !handle && 'pl-3', className)}>
      {handle}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{section.name}</span>
          <Badge variant="secondary" className="font-mono">
            {section.type}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{sectionHeadline(section.props) ?? section.id}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil /> Textos
      </Button>
      {onReplace && (
        <Button variant="ghost" size="icon-sm" onClick={onReplace} aria-label={`Cambiar ${section.name}`} title="Cambiar por otra sección">
          <ArrowLeftRight />
        </Button>
      )}
      {onRemove && (
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Quitar ${section.name}`} title="Quitar de la vista">
          <X />
        </Button>
      )}
    </li>
  );
}

export function SortableSectionRow(props: Omit<RowProps, 'handle' | 'style' | 'ref' | 'className'>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.section.id });
  return (
    <SectionRow
      {...props}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'relative z-10 shadow-lg ring-1 ring-foreground/20')}
      handle={
        <button
          type="button"
          className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
          aria-label={`Reordenar ${props.section.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      }
    />
  );
}
