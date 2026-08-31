-- Creator-chosen stubbornness for the No button (additive, never-drop rule).
-- CONFIRM-GATED: do not apply without explicit user yes.
--
--   0  = No never runs away
--   n  = runs away n times, then lets itself be caught
--  -1  = runs away forever (the guest's only reachable answer is Yes)
--
-- enable_dodge_no is kept in sync but is no longer read by the app; the
-- backfill below preserves today's behaviour exactly for every live invite.

alter table invites add column if not exists dodge_limit smallint;

update invites
   set dodge_limit = case when coalesce(enable_dodge_no, true) then 5 else 0 end
 where dodge_limit is null;

alter table invites alter column dodge_limit set default 5;

alter table invites drop constraint if exists invites_dodge_limit_range;
alter table invites add constraint invites_dodge_limit_range
  check (dodge_limit is null or (dodge_limit >= -1 and dodge_limit <= 50));
