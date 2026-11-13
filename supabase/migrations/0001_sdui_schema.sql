-- SDUI backend for the demo: the tables the manager (sdui-admin) edits and the
-- view the clients (sdui-web) read.
--
--   sdui_themes           color variants (semantic id; the client owns the real tokens)
--   sdui_sections         catalog of sections. Sections are NOT created from the
--                         manager: they come from the seed. Wording lives here.
--   sdui_screen_configs   one row per screen (home) and which layout is live
--   sdui_layouts          a "vista": theme + header + ordered body + bottom bar
--   sdui_layout_sections  the ordered body of each layout
--   sdui_screens (view)   screen_id + payload: the Screen JSON of the live layout
--
-- Safe to re-run: it drops and recreates everything (then run seed.sql).
-- Demo only: no RLS, everything is open to the publishable key.

drop view if exists public.sdui_screens;
drop function if exists public.sdui_set_layout_sections(text, text[]);
drop function if exists public.sdui_layout_payload(text);
drop function if exists public.sdui_section_json(public.sdui_sections);
drop table if exists public.sdui_layout_sections;
drop table if exists public.sdui_layouts cascade;
drop table if exists public.sdui_screen_configs cascade;
drop table if exists public.sdui_sections cascade;
drop table if exists public.sdui_themes cascade;

/* -------------------------------------------------------------------------- */
/* Tables                                                                      */
/* -------------------------------------------------------------------------- */

create table public.sdui_themes (
  -- What travels in `screen.theme`. The client maps it to its own tokens.
  id            text primary key,
  name          text not null,
  -- Only for the swatches in the manager; never sent to clients.
  brand         text not null,
  on_brand      text not null,
  highlight     text not null,
  on_highlight  text not null,
  position      int  not null default 0
);

create table public.sdui_sections (
  -- `section.id` in the payload: unique on a screen, used by analytics.
  id          text primary key,
  -- Label in the manager.
  name        text not null,
  -- Where it can be placed.
  slot        text not null check (slot in ('header', 'body', 'bottomBar')),
  type        text not null,
  version     int  not null default 1 check (version >= 1),
  props       jsonb not null default '{}'::jsonb,
  actions     jsonb,
  updated_at  timestamptz not null default now()
);

create table public.sdui_screen_configs (
  screen_id         text primary key,
  name              text not null,
  schema_version    text not null default '1.1.0',
  meta_title        text not null,
  actions           jsonb,
  -- The layout the clients get. FK added below (layouts reference screens too).
  active_layout_id  text
);

create table public.sdui_layouts (
  id                     text primary key,
  screen_id              text not null references public.sdui_screen_configs (screen_id) on delete cascade,
  name                   text not null,
  description            text,
  theme_id               text not null default 'default' references public.sdui_themes (id),
  header_section_id      text references public.sdui_sections (id) on delete set null,
  bottom_bar_section_id  text references public.sdui_sections (id) on delete set null,
  position               int  not null default 0,
  updated_at             timestamptz not null default now()
);

alter table public.sdui_screen_configs
  add constraint sdui_screen_configs_active_layout_fk
  foreign key (active_layout_id) references public.sdui_layouts (id) on delete set null;

create table public.sdui_layout_sections (
  layout_id   text not null references public.sdui_layouts (id) on delete cascade,
  section_id  text not null references public.sdui_sections (id) on delete cascade,
  position    int  not null,
  -- A section appears at most once per layout: ids are unique on a screen.
  primary key (layout_id, section_id)
);

create index sdui_layout_sections_order on public.sdui_layout_sections (layout_id, position);

/* -------------------------------------------------------------------------- */
/* Payload                                                                     */
/* -------------------------------------------------------------------------- */

-- One catalog row → one contract Section. `actions` is omitted when null.
create function public.sdui_section_json(s public.sdui_sections)
returns jsonb language sql stable as $$
  select jsonb_build_object('id', s.id, 'type', s.type, 'version', s.version, 'props', s.props)
      || case when s.actions is null then '{}'::jsonb else jsonb_build_object('actions', s.actions) end
$$;

-- The Screen JSON of ONE layout, live or not. The manager uses it to preview
-- any layout; the view below uses it for the live one.
create function public.sdui_layout_payload(p_layout_id text)
returns jsonb language sql stable as $$
  select jsonb_build_object(
           'schemaVersion', sc.schema_version,
           'screenId', sc.screen_id,
           'theme', l.theme_id,
           'meta', jsonb_build_object(
             'title', sc.meta_title,
             'experiment', jsonb_build_object('id', sc.screen_id || '_view', 'variant', l.id)
           ),
           'sections', coalesce(
             (select jsonb_agg(public.sdui_section_json(s) order by ls.position)
                from public.sdui_layout_sections ls
                join public.sdui_sections s on s.id = ls.section_id
               where ls.layout_id = l.id),
             '[]'::jsonb
           )
         )
      || case when sc.actions is null then '{}'::jsonb else jsonb_build_object('actions', sc.actions) end
      || coalesce(
           (select jsonb_build_object('header', public.sdui_section_json(h))
              from public.sdui_sections h where h.id = l.header_section_id),
           '{}'::jsonb
         )
      || coalesce(
           (select jsonb_build_object('bottomBar', public.sdui_section_json(b))
              from public.sdui_sections b where b.id = l.bottom_bar_section_id),
           '{}'::jsonb
         )
    from public.sdui_layouts l
    join public.sdui_screen_configs sc on sc.screen_id = l.screen_id
   where l.id = p_layout_id
$$;

-- What the clients read: one row per screen with its live layout.
create view public.sdui_screens as
  select sc.screen_id, public.sdui_layout_payload(sc.active_layout_id) as payload
    from public.sdui_screen_configs sc
   where sc.active_layout_id is not null;

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

-- Replaces the body of a layout in one transaction: the array order is the
-- order on screen. Covers reorder, add and remove.
create function public.sdui_set_layout_sections(p_layout_id text, p_section_ids text[])
returns void language sql as $$
  delete from public.sdui_layout_sections where layout_id = p_layout_id;

  insert into public.sdui_layout_sections (layout_id, section_id, position)
  select p_layout_id, t.section_id, t.ord
    from unnest(p_section_ids) with ordinality as t(section_id, ord);

  update public.sdui_layouts set updated_at = now() where id = p_layout_id;
$$;

/* -------------------------------------------------------------------------- */
/* Access: demo, everything open                                               */
/* -------------------------------------------------------------------------- */

alter table public.sdui_themes          disable row level security;
alter table public.sdui_sections        disable row level security;
alter table public.sdui_screen_configs  disable row level security;
alter table public.sdui_layouts         disable row level security;
alter table public.sdui_layout_sections disable row level security;

grant select, insert, update, delete on
  public.sdui_themes, public.sdui_sections, public.sdui_screen_configs,
  public.sdui_layouts, public.sdui_layout_sections
  to anon, authenticated;
grant select on public.sdui_screens to anon, authenticated;
grant execute on function
  public.sdui_layout_payload(text), public.sdui_set_layout_sections(text, text[])
  to anon, authenticated;

-- Make the API see the new objects right away.
notify pgrst, 'reload schema';
