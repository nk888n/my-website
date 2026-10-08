-- Website Editor persistence
create table if not exists public.site_editor_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_editor_content enable row level security;
create index if not exists site_editor_content_updated_at_idx
  on public.site_editor_content(updated_at);

-- Public asset bucket used by the authenticated admin upload endpoint.
insert into storage.buckets (id,name,public)
values ('site-assets','site-assets',true)
on conflict (id) do update set public=true;
