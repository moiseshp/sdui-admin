import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { ScreenManager } from '@/components/screen-manager';
import { SetupNotice } from '@/components/setup-notice';
import { loadAdminData } from '@/lib/data';

export default function ScreenPage({ params }: PageProps<'/screens/[screenId]'>) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando…</p>}>
      <Manager params={params} />
    </Suspense>
  );
}

async function Manager({ params }: { params: Promise<{ screenId: string }> }) {
  await connection(); // Always read the database on request, never at build time.
  const { screenId } = await params;
  const loaded = await loadAdminData(screenId);

  if (loaded.status === 'not_configured') return <SetupNotice />;
  if (loaded.status === 'error') return <SetupNotice error={loaded.message} />;
  if (!loaded.data) notFound();

  return <ScreenManager initial={loaded.data} />;
}
