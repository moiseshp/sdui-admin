import { cn } from '@/lib/utils';
import type { Theme } from '@/lib/types';

/** The two colors that identify a theme. Preview only: clients own the real tokens. */
export function ThemeSwatch({ theme, className }: { theme: Theme; className?: string }) {
  return (
    <span className={cn('inline-flex h-4 w-7 shrink-0 overflow-hidden rounded-sm ring-1 ring-foreground/15', className)} aria-hidden>
      <span className="flex-1" style={{ backgroundColor: theme.brand }} />
      <span className="flex-1" style={{ backgroundColor: theme.highlight }} />
    </span>
  );
}
