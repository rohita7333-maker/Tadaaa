"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { springs, makeReducedMotionTransition } from "@/lib/motion";
import type { StoryEventInput } from "@/lib/schemas";
import { LABEL, INPUT, WIZ_H2 } from "./editorial";

export type StoryEventDraft = StoryEventInput;

interface EventsEditorProps {
  events: StoryEventDraft[];
  onEventsChange: (events: StoryEventDraft[]) => void;
}

// Field length caps mirror eventsSchema so the UI can never submit an invalid
// payload — the server re-validates with the same schema as the source of truth.
const MAX_EVENTS = 4;
const MAX_LABEL = 30;
const MAX_TITLE = 80;
const MAX_DETAIL = 120;
const MAX_MAPS = 120;

const EMPTY_EVENT: StoryEventDraft = {
  label: "",
  title: "",
  detail: "",
  mapsQuery: "",
};

/**
 * Scroll-story plaques — mockup `.contribitem` card anatomy (L358-362) with
 * `.field` inputs inside. Blank rows are filtered server-side by
 * `eventsSchema`; this editor only collects.
 */
export default function EventsEditor({ events, onEventsChange }: EventsEditorProps) {
  const shouldReduce = useReducedMotion();

  function addEvent() {
    if (events.length >= MAX_EVENTS) return;
    onEventsChange([...events, { ...EMPTY_EVENT }]);
  }

  function removeEvent(index: number) {
    onEventsChange(events.filter((_, i) => i !== index));
  }

  function updateEvent(index: number, patch: Partial<StoryEventDraft>) {
    onEventsChange(events.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  return (
    <div>
      <h2 className={WIZ_H2}>The plan</h2>
      <p className="mb-5 text-sm text-stone">
        Up to four plaques in the cinematic scroll: the when, the where, the
        little details. Leave it empty and the story shows a single countdown
        plaque instead.
      </p>

      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {events.map((event, i) => (
            <motion.div
              key={i}
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className="rounded-[var(--r-md)] border border-mist bg-paper p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
                  Plaque {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeEvent(i)}
                  aria-label={`Remove plaque ${i + 1}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-mist text-coral-deep transition-colors hover:border-coral-deep hover:bg-chip-coral-bg focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mb-3">
                <label htmlFor={`event-label-${i}`} className={LABEL}>
                  Label
                </label>
                <input
                  id={`event-label-${i}`}
                  type="text"
                  value={event.label}
                  onChange={(e) => updateEvent(i, { label: e.target.value.slice(0, MAX_LABEL) })}
                  placeholder="When"
                  maxLength={MAX_LABEL}
                  className={INPUT}
                />
              </div>

              <div className="mb-3">
                <label htmlFor={`event-title-${i}`} className={LABEL}>
                  Title
                </label>
                <input
                  id={`event-title-${i}`}
                  type="text"
                  value={event.title}
                  onChange={(e) => updateEvent(i, { title: e.target.value.slice(0, MAX_TITLE) })}
                  placeholder="Saturday, October 24 · 5:30 PM"
                  maxLength={MAX_TITLE}
                  className={INPUT}
                />
              </div>

              <div className="mb-3">
                <label htmlFor={`event-detail-${i}`} className={LABEL}>
                  Detail (optional)
                </label>
                <input
                  id={`event-detail-${i}`}
                  type="text"
                  value={event.detail ?? ""}
                  onChange={(e) => updateEvent(i, { detail: e.target.value.slice(0, MAX_DETAIL) })}
                  placeholder="golden hour, sharp"
                  maxLength={MAX_DETAIL}
                  className={INPUT}
                />
              </div>

              <div>
                <label htmlFor={`event-maps-${i}`} className={LABEL}>
                  Map location (optional)
                </label>
                <input
                  id={`event-maps-${i}`}
                  type="text"
                  value={event.mapsQuery ?? ""}
                  onChange={(e) => updateEvent(i, { mapsQuery: e.target.value.slice(0, MAX_MAPS) })}
                  placeholder="Sunset Terrace, Jubilee Hills, Hyderabad"
                  maxLength={MAX_MAPS}
                  className={INPUT}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {events.length < MAX_EVENTS && (
        <button
          type="button"
          onClick={addEvent}
          className="ed-btn ed-btn-line ed-btn-sm mt-3"
        >
          <Plus className="h-3.5 w-3.5" />
          Add plaque
          {events.length > 0 && (
            <span className="text-stone">
              {events.length}/{MAX_EVENTS}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
