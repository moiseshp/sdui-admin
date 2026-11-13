'use server';

/**
 * Every write the manager does. Each one is a single statement (or one RPC),
 * so the database never holds a half-applied change: the client reads the
 * `sdui_screens` view and sees the result on its next reload.
 *
 * Demo: no authentication, like the database itself.
 */

import { getSupabase } from '@/lib/supabase';
import type { ActionResult } from '@/lib/types';

const done: ActionResult = { ok: true, data: undefined };
const failed = (error: { message: string }): ActionResult<never> => ({ ok: false, error: error.message });

/** Makes a layout the one the clients receive. */
export async function activateLayout(screenId: string, layoutId: string): Promise<ActionResult> {
  const { error } = await getSupabase().from('sdui_screen_configs').update({ active_layout_id: layoutId }).eq('screen_id', screenId);
  return error ? failed(error) : done;
}

/** Color variant: independent from the layout's sections. */
export async function setLayoutTheme(layoutId: string, themeId: string): Promise<ActionResult> {
  const { error } = await getSupabase().from('sdui_layouts').update({ theme_id: themeId }).eq('id', layoutId);
  return error ? failed(error) : done;
}

/** Changes (or clears) the section of a fixed slot. */
export async function setLayoutSlot(layoutId: string, slot: 'header' | 'bottomBar', sectionId: string | null): Promise<ActionResult> {
  const column = slot === 'header' ? 'header_section_id' : 'bottom_bar_section_id';
  const { error } = await getSupabase().from('sdui_layouts').update({ [column]: sectionId }).eq('id', layoutId);
  return error ? failed(error) : done;
}

/** The whole body, in order: covers reorder, add, replace and remove. */
export async function setLayoutSections(layoutId: string, sectionIds: string[]): Promise<ActionResult> {
  const { error } = await getSupabase().rpc('sdui_set_layout_sections', { p_layout_id: layoutId, p_section_ids: sectionIds });
  return error ? failed(error) : done;
}

/** Wording: the section's props with its texts changed. Applies to every layout that uses it. */
export async function updateSectionProps(sectionId: string, props: Record<string, unknown>): Promise<ActionResult> {
  const { error } = await getSupabase()
    .from('sdui_sections')
    .update({ props, updated_at: new Date().toISOString() })
    .eq('id', sectionId);
  return error ? failed(error) : done;
}

/** The Screen JSON the backend builds for a layout, live or not. */
export async function getLayoutPayload(layoutId: string): Promise<ActionResult<unknown>> {
  const { data, error } = await getSupabase().rpc('sdui_layout_payload', { p_layout_id: layoutId });
  return error ? failed(error) : { ok: true, data };
}
