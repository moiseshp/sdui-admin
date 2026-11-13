'use client';

import { useState } from 'react';
import { Braces, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getLayoutPayload } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Clipboard API first; if the browser denies it (embedded views, no HTTPS),
 * falls back to a hidden textarea and execCommand.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    // Inside the dialog: a modal dialog keeps focus (and selection) within itself.
    (document.querySelector('[data-slot="dialog-content"]') ?? document.body).appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    return ok;
  }
}

type State ={ status: 'loading' } | { status: 'ok'; json: string } | { status: 'error'; message: string };

/**
 * The Screen JSON the backend builds for a layout: what a client would receive.
 * Read from the database each time it opens, so it always reflects the last save.
 */
export function PayloadDialog({ layoutId, layoutName, isLive }: { layoutId: string; layoutName: string; isLive: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: 'loading' });

  function show() {
    setOpen(true);
    setState({ status: 'loading' });
    getLayoutPayload(layoutId)
      .then((result) =>
        setState(result.ok ? { status: 'ok', json: JSON.stringify(result.data, null, 2) } : { status: 'error', message: result.error }),
      )
      .catch(() => setState({ status: 'error', message: 'No se pudo conectar con el servidor.' }));
  }

  return (
    <>
      <Button variant="outline" onClick={show}>
        <Braces /> Ver JSON sdui
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-3xl">
          <DialogHeader className="pr-8">
            <DialogTitle>JSON sdui · {layoutName}</DialogTitle>
            <DialogDescription>
              {isLive ? 'Es lo que recibe el cliente en su siguiente carga.' : 'Esta vista no está en vivo: es lo que recibiría el cliente si la activas.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={state.status !== 'ok'}
              onClick={() => {
                if (state.status !== 'ok') return;
                copyText(state.json).then((ok) => (ok ? toast.success('JSON copiado') : toast.error('No se pudo copiar')));
              }}
            >
              <Copy /> Copiar
            </Button>
          </div>
          <pre className="h-[min(70dvh,40rem)] overflow-auto rounded-lg border bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-100">
            {state.status === 'error' ? (
              <span className="text-red-300">{state.message}</span>
            ) : state.status === 'ok' ? (
              state.json
            ) : (
              'Cargando…'
            )}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
