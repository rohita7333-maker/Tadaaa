# TaDaaaa — App Coherence Overhaul Roadmap

Milestone: 16-point audit closure (2026-08-02). Full plan: `docs/superpowers/plans/2026-08-02-app-coherence.md` (single source of truth — phases below mirror it for gsd tooling).

- [ ] **Phase W0 — One Chrome** · authed identity bar on every product page, active nav states, hide marketing sections for signed-in, wizard back affordance. Model: Opus 4.8, caveman. Points: 1,2,4,7a,8,12,13.
- [ ] **Phase W1 — Template Is The Product** · wizard template-mode collapse (summary chip + change), strip mid-wizard pricing, single premium gate at Publish. Model: Opus 4.8, caveman. Points: 7b,7c,2.
- [ ] **Phase W2 — Living Stats & Named Guests** · RSVP name capture, clickable stat tiles → activity feed, ResponsesModal surfacing, creator-skip regression test. Model: Opus 4.8, caveman. Points: 9,3,16,14-test. Gate: RLS change (if needed) requires shown-SQL + user yes.
- [ ] **Phase W3 — Catalog Depth & Honest Demo** · style/price filters + counts, curated `/surprise/demo`, de-link `/surprise/test`, occasion curation, art slots. Model: Sonnet 5, caveman. Points: 10,11-slots,13,16.
- [ ] **Phase W4 — Art & Elegance** · art packs per docs/art/style-prompts.md, impeccable polish sweep, taste anti-slop copy, emil motion review, Lighthouse guard. Model: Sonnet 5, caveman (+user imagegen). Point: 11.
- [ ] **Phase W5 — Feature-Complete Hardening** · OAuth redirect config (user), click-audit closure (magic/gift/palette/art-dl), email-verify hardening, push_tokens migration (CONFIRM-GATED), Stripe E2E, next patch bump. Model: Sonnet 5, caveman. Points: 5,6,16.
- [ ] **Phase W6 — Final Sweep & Ship-Ready** · full nav re-walk, E2E matrix both platforms, cross-browser, comprehensive review + security, delivery report. Model: Fable verification. Point: 15.

Rules: caveman dev always · web+mobile parity inside each phase · no commits until user go · no migrations without shown SQL + yes · memory update closes every phase.
