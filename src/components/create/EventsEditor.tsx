"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { springs, makeReducedMotionTransition } from "@/lib/motion";
import type { StoryEventInput } from "@/lib/schemas";

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

const inputClass =
  "w-full h-10 bg-white rounded-xl border border-[#D4CBC3] px-3 text-sm text-[#2D2926] placeholder:text-[#D4CBC3] focus:outline-none focus:border-[#C4686D] focus-visible:ring-2 focus-visible:ring-[#C4686D]/20 transition-all";

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
    <div className="bg-white rounded-2xl border border-[#D4CBC3]/40 shadow-[0_4px_16px_rgba(45,41,38,0.04)] p-6">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4 text-[#C4686D]" />
        <h3 className="font-heading text-base text-[#2D2926]">The plan (optional)</h3>
      </div>
      <p className="text-xs text-[#6B5E57] mb-5">
        Add up to 4 plaques to the cinematic scroll — the when, the where, the
        little details. Leave it empty and the story shows a single countdown
        plaque instead. ✨
      </p>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {events.map((event, i) => (
            <motion.div
              key={i}
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className="bg-[#FFF8F0] rounded-2xl border border-[#D4CBC3]/50 p-4 space-y-3"
            >
              {/* Label + remove */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label
                    htmlFor={`event-label-${i}`}
                    className="block text-[10px] font-semibold text-[#C4686D] uppercase tracking-wider mb-1"
                  >
                    Label
                  </Label>
                  <input
                    id={`event-label-${i}`}
                    type="text"
                    value={event.label}
                    onChange={(e) =>
                      updateEvent(i, { label: e.target.value.slice(0, MAX_LABEL) })
                    }
                    placeholder="When"
                    maxLength={MAX_LABEL}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeEvent(i)}
                  aria-label={`Remove plaque ${i + 1}`}
                  className="mt-6 h-10 w-10 rounded-full border border-[#D4CBC3] text-[#C4686D] hover:bg-[#FFF0EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4686D]/40 flex items-center justify-center transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title */}
              <div>
                <Label
                  htmlFor={`event-title-${i}`}
                  className="block text-[10px] font-semibold text-[#6B5E57] uppercase tracking-wider mb-1"
                >
                  Title
                </Label>
                <input
                  id={`event-title-${i}`}
                  type="text"
                  value={event.title}
                  onChange={(e) =>
                    updateEvent(i, { title: e.target.value.slice(0, MAX_TITLE) })
                  }
                  placeholder="Saturday, October 24 · 5:30 PM"
                  maxLength={MAX_TITLE}
                  className={inputClass}
                />
              </div>

              {/* Detail */}
              <div>
                <Label
                  htmlFor={`event-detail-${i}`}
                  className="block text-[10px] font-semibold text-[#6B5E57] uppercase tracking-wider mb-1"
                >
                  Detail (optional)
                </Label>
                <input
                  id={`event-detail-${i}`}
                  type="text"
                  value={event.detail ?? ""}
                  onChange={(e) =>
                    updateEvent(i, { detail: e.target.value.slice(0, MAX_DETAIL) })
                  }
                  placeholder="golden hour, sharp"
                  maxLength={MAX_DETAIL}
                  className={inputClass}
                />
              </div>

              {/* Maps query */}
              <div>
                <Label
                  htmlFor={`event-maps-${i}`}
                  className="block text-[10px] font-semibold text-[#6B5E57] uppercase tracking-wider mb-1"
                >
                  Map location (optional)
                </Label>
                <input
                  id={`event-maps-${i}`}
                  type="text"
                  value={event.mapsQuery ?? ""}
                  onChange={(e) =>
                    updateEvent(i, { mapsQuery: e.target.value.slice(0, MAX_MAPS) })
                  }
                  placeholder="Sunset Terrace, Jubilee Hills, Hyderabad"
                  maxLength={MAX_MAPS}
                  className={inputClass}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {events.length < MAX_EVENTS && (
        <Button
          type="button"
          onClick={addEvent}
          variant="outline"
          className="mt-4 w-full h-10 rounded-full border-dashed border-[#C4686D]/50 text-[#C4686D] hover:bg-[#FFF0EE] hover:border-[#C4686D] text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add plaque
          {events.length > 0 && (
            <span className="ml-auto text-xs text-[#D4CBC3]">
              {events.length}/{MAX_EVENTS}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
