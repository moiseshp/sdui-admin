/** Reads for the manager's pages. Mutations live in app/actions.ts. */

import { getSupabase, isSupabaseConfigured } from './supabase';
import type { AdminData, Layout, ScreenConfig, Section, Theme } from './types';

export type Loaded<T> = { status: 'ok'; data: T } | { status: 'not_configured' } | { status: 'error'; message: string };

type LayoutRow = Omit<Layout, 'section_ids'>;
type LayoutSectionRow = { layout_id: string; section_id: string; position: number };

function fail(message: string): { status: 'error'; message: string } {
  return { status: 'error', message };
}

/** Screens with the name and theme of their live layout, for the list. */
export type ScreenSummary = ScreenConfig & { layout: (LayoutRow & { section_count: number }) | null; theme: Theme | null };

export async function loadScreens(): Promise<Loaded<ScreenSummary[]>> {
  if (!isSupabaseConfigured()) return { status: 'not_configured' };
  const db = getSupabase();

  const [screens, layouts, layoutSections, themes] = await Promise.all([
    db.from('sdui_screen_configs').select('screen_id, name, meta_title, active_layout_id').order('screen_id'),
    db.from('sdui_layouts').select('*'),
    db.from('sdui_layout_sections').select('layout_id, section_id, position'),
    db.from('sdui_themes').select('*'),
  ]);
  const error = screens.error ?? layouts.error ?? layoutSections.error ?? themes.error;
  if (error) return fail(error.message);

  const data = (screens.data as ScreenConfig[]).map((screen) => {
    const layout = (layouts.data as LayoutRow[]).find((l) => l.id === screen.active_layout_id) ?? null;
    const sectionCount = (layoutSections.data as LayoutSectionRow[]).filter((ls) => ls.layout_id === layout?.id).length;
    return {
      ...screen,
      layout: layout && { ...layout, section_count: sectionCount },
      theme: (themes.data as Theme[]).find((t) => t.id === layout?.theme_id) ?? null,
    };
  });
  return { status: 'ok', data };
}

/** Everything the manager needs to edit one screen. */
export async function loadAdminData(screenId: string): Promise<Loaded<AdminData | null>> {
  if (!isSupabaseConfigured()) return { status: 'not_configured' };
  const db = getSupabase();

  const [screen, layouts, layoutSections, sections, themes] = await Promise.all([
    db.from('sdui_screen_configs').select('screen_id, name, meta_title, active_layout_id').eq('screen_id', screenId).maybeSingle(),
    db.from('sdui_layouts').select('*').eq('screen_id', screenId).order('position'),
    db.from('sdui_layout_sections').select('layout_id, section_id, position').order('position'),
    db.from('sdui_sections').select('id, name, slot, type, version, props').order('name'),
    db.from('sdui_themes').select('*').order('position'),
  ]);
  const error = screen.error ?? layouts.error ?? layoutSections.error ?? sections.error ?? themes.error;
  if (error) return fail(error.message);
  if (!screen.data) return { status: 'ok', data: null };

  const body = layoutSections.data as LayoutSectionRow[];
  return {
    status: 'ok',
    data: {
      screen: screen.data as ScreenConfig,
      layouts: (layouts.data as LayoutRow[]).map((layout) => ({
        ...layout,
        section_ids: body.filter((ls) => ls.layout_id === layout.id).map((ls) => ls.section_id),
      })),
      sections: sections.data as Section[],
      themes: themes.data as Theme[],
    },
  };
}
