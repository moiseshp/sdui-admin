import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SetupNotice } from '@/components/setup-notice';
import { ThemeSwatch } from '@/components/theme-swatch';
import { loadScreens } from '@/lib/data';

export default function ScreensPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold">Pantallas</h1>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">
        Cada pantalla tiene varias vistas. La vista en vivo es la que reciben los clientes en su siguiente carga.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
        <ScreenList />
      </Suspense>
    </div>
  );
}

async function ScreenList() {
  await connection(); // Always read the database on request, never at build time.
  const screens = await loadScreens();

  if (screens.status === 'not_configured') return <SetupNotice />;
  if (screens.status === 'error') return <SetupNotice error={screens.message} />;
  if (screens.data.length === 0) return <SetupNotice error="No hay pantallas: falta ejecutar supabase/seed.sql" />;

  return (
    <ul className="space-y-3">
      {screens.data.map((screen) => (
        <li key={screen.screen_id}>
          <Link
            href={`/screens/${screen.screen_id}`}
            className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{screen.name}</span>
                <code className="font-mono text-xs text-muted-foreground">{screen.screen_id}</code>
              </div>
              {screen.layout ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge>En vivo</Badge>
                  <span className="text-foreground">{screen.layout.name}</span>
                  <span>·</span>
                  {screen.theme && <ThemeSwatch theme={screen.theme} />}
                  <span>{screen.theme?.name ?? screen.layout.theme_id}</span>
                  <span>·</span>
                  <span>{screen.layout.section_count} secciones</span>
                </div>
              ) : (
                <p className="mt-1.5 text-sm text-muted-foreground">Sin vista en vivo</p>
              )}
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
