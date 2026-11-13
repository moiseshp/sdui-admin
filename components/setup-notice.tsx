import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Shown instead of the manager when the database is not reachable yet. */
export function SetupNotice({ error }: { error?: string }) {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{error ? 'No se pudo leer la base de datos' : 'Falta conectar Supabase'}</CardTitle>
        <CardDescription>
          {error ? (
            <>
              Supabase respondió: <code className="font-mono text-destructive">{error}</code>
            </>
          ) : (
            'El gestor lee y escribe en la misma base que usa el cliente web.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            Copia <code className="font-mono">.env.example</code> a <code className="font-mono">.env.local</code> y completa{' '}
            <code className="font-mono">SUPABASE_URL</code> y <code className="font-mono">SUPABASE_PUBLISHABLE_KEY</code>.
          </li>
          <li>
            En el SQL Editor de Supabase ejecuta <code className="font-mono">supabase/migrations/0001_sdui_schema.sql</code> y luego{' '}
            <code className="font-mono">supabase/seed.sql</code>.
          </li>
          <li>Reinicia el servidor de desarrollo y recarga esta página.</li>
        </ol>
      </CardContent>
    </Card>
  );
}
