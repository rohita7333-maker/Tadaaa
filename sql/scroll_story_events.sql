-- Scroll-story event plaques (Phase 3)
-- Additive + idempotent. Rollback: alter table public.invites drop column if exists events;
alter table public.invites
  add column if not exists events jsonb not null default '[]'::jsonb;

comment on column public.invites.events is
  'Scroll-story plaques: [{label,title,detail?,mapsQuery?}], max 4, validated app-side (zod eventsSchema). Keys are camelCase — stored verbatim from the client payload and read back as-is by from-invite.ts.';
