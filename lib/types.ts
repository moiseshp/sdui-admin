/** Rows of the SDUI tables (supabase/migrations/0001_sdui_schema.sql), as the manager uses them. */

export type Slot = 'header' | 'body' | 'bottomBar';

export type Theme = {
  id: string;
  name: string;
  brand: string;
  on_brand: string;
  highlight: string;
  on_highlight: string;
};

export type Section = {
  id: string;
  name: string;
  slot: Slot;
  type: string;
  version: number;
  props: Record<string, unknown>;
};

export type Layout = {
  id: string;
  screen_id: string;
  name: string;
  description: string | null;
  theme_id: string;
  header_section_id: string | null;
  bottom_bar_section_id: string | null;
  /** Body sections, in screen order (from sdui_layout_sections). */
  section_ids: string[];
};

export type ScreenConfig = {
  screen_id: string;
  name: string;
  meta_title: string;
  active_layout_id: string | null;
};

export type AdminData = {
  screen: ScreenConfig;
  layouts: Layout[];
  sections: Section[];
  themes: Theme[];
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
