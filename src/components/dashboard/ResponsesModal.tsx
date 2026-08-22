"use client";

import { useState, useEffect } from "react";
import {
  MessageCircleQuestion,
  ThumbsUp,
  ThumbsDown,
  Users,
  Activity,
  Eye,
  Heart,
  Shield,
} from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { getInviteResponses, getInviteInsights, type InviteInsights } from "@/actions/questions";
import { type QuestionWithAnswers } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface ResponsesModalProps {
  inviteId: string;
  open: boolean;
  onClose: () => void;
}

type Tab = "activity" | "responses";

export default function ResponsesModal({ inviteId, open, onClose }: ResponsesModalProps) {
  const [tab, setTab] = useState<Tab>("activity");
  const [questions, setQuestions] = useState<QuestionWithAnswers[] | null>(null);
  const [insights, setInsights] = useState<InviteInsights | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [resp, ins] = await Promise.all([
          getInviteResponses(inviteId),
          getInviteInsights(inviteId),
        ]);
        if (!cancelled) {
          setQuestions(resp);
          setInsights(ins);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, inviteId]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-coral-deep" />
          <DialogTitle>Insights</DialogTitle>
        </div>
      </DialogHeader>

      {/* Tab strip */}
      <div className="px-5 pt-1 pb-3 flex items-center gap-1 border-b border-mist">
        <TabButton current={tab} value="activity" onClick={() => setTab("activity")} icon={Activity} label="Activity" />
        <TabButton current={tab} value="responses" onClick={() => setTab("responses")} icon={MessageCircleQuestion} label="Responses" />
      </div>

      <DialogBody className="max-h-[70vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div
              className="w-6 h-6 rounded-full border-2 border-mist border-t-coral animate-spin"
              aria-label="Loading"
            />
          </div>
        )}

        {!loading && tab === "activity" && (
          <ActivityTab insights={insights} />
        )}

        {!loading && tab === "responses" && (
          <ResponsesTab questions={questions} />
        )}
      </DialogBody>
    </Dialog>
  );
}

function TabButton({
  current,
  value,
  onClick,
  icon: Icon,
  label,
}: {
  current: Tab;
  value: Tab;
  onClick: () => void;
  icon: typeof Activity;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
        active
          ? "bg-chip-coral-bg text-coral-deep"
          : "text-stone hover:bg-pebble"
      }`}
      aria-pressed={active}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function ActivityTab({ insights }: { insights: InviteInsights | null }) {
  if (!insights) {
    return (
      <p className="py-6 text-center text-sm text-stone">
        Couldn&apos;t load activity. Try again later.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-pebble rounded-[12px] p-4 border border-mist">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-sand-light flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-sand-deep" />
            </div>
            <p className="text-xs text-stone font-medium">Views</p>
          </div>
          <p className="font-heading text-2xl text-ink font-bold">
            {insights.viewCount.toLocaleString()}
          </p>
        </div>
        <div className="bg-pebble rounded-[12px] p-4 border border-mist">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-chip-coral-bg flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-coral-deep" />
            </div>
            <p className="text-xs text-stone font-medium">RSVPs</p>
          </div>
          <p className="font-heading text-2xl text-ink font-bold">
            {insights.rsvpCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* RSVP timeline */}
      <div>
        <p className="text-xs text-stone font-semibold uppercase tracking-wider mb-2">
          Recent RSVPs
        </p>
        {insights.rsvps.length === 0 ? (
          <div className="bg-pebble rounded-[12px] p-5 text-center border border-mist">
            <Heart className="w-7 h-7 text-sand-deep mx-auto mb-2" />
            <p className="text-sm text-stone font-medium">No RSVPs yet</p>
            <p className="text-xs text-sand-deep mt-1">
              Share your invite to start collecting responses.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {insights.rsvps.slice(0, 20).map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between bg-pebble rounded-[6px] px-4 py-2.5 border border-mist"
              >
                <span className="flex items-center gap-2.5 text-sm text-ink">
                  <span className="w-7 h-7 rounded-full bg-chip-coral-bg flex items-center justify-center text-xs font-bold text-coral-deep uppercase">
                    {r.name ? r.name.charAt(0) : i + 1}
                  </span>
                  <span className="font-medium">{r.name || `Guest ${i + 1}`}</span>
                </span>
                <span className="text-xs text-stone">
                  {formatDistanceToNow(new Date(r.responded_at), { addSuffix: true })}
                </span>
              </li>
            ))}
            {insights.rsvps.length > 20 && (
              <li className="text-xs text-center text-stone pt-2">
                + {insights.rsvps.length - 20} more
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2.5 bg-pebble rounded-[12px] p-4 border border-mist">
        <Shield className="w-4 h-4 text-stone mt-0.5 flex-shrink-0" />
        <p className="text-xs text-stone leading-relaxed">
          <span className="font-semibold text-ink">Privacy by design.</span>{" "}
          Views and RSVPs are anonymous — recipients can RSVP without signing in. Names
          show only when a guest chooses to add one; otherwise you see counts and timestamps.
        </p>
      </div>
    </div>
  );
}

function ResponsesTab({ questions }: { questions: QuestionWithAnswers[] | null }) {
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-10">
        <MessageCircleQuestion className="w-10 h-10 text-sand-deep mx-auto mb-3" />
        <p className="text-sm text-stone font-medium">No questions yet</p>
        <p className="text-xs text-sand-deep mt-1">
          Add questions in your invite to collect responses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q) => {
        const yesCount = q.invite_answers.filter((a) => a.answer === true).length;
        const noCount = q.invite_answers.filter((a) => a.answer === false).length;
        const total = q.invite_answers.length;
        const yesPercent = total > 0 ? Math.round((yesCount / total) * 100) : 0;
        const noPercent = total > 0 ? Math.round((noCount / total) * 100) : 0;

        return (
          <div
            key={q.id}
            className="bg-pebble rounded-[12px] border border-mist p-4"
          >
            <p className="text-sm font-medium text-ink mb-3 leading-snug">
              {q.question_text}
            </p>

            {total === 0 ? (
              <p className="text-xs text-sand-deep">No responses yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <ThumbsUp className="w-3 h-3 text-success" />
                    <span className="text-xs font-medium text-ink">Yes</span>
                  </div>
                  <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${yesPercent}%`, backgroundColor: "var(--success)" }}
                    />
                  </div>
                  <span className="text-xs text-stone w-12 text-right shrink-0">
                    {yesCount} ({yesPercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-16 shrink-0">
                    <ThumbsDown className="w-3 h-3 text-coral-deep" />
                    <span className="text-xs font-medium text-ink">No</span>
                  </div>
                  <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${noPercent}%`, backgroundColor: "var(--coral)" }}
                    />
                  </div>
                  <span className="text-xs text-stone w-12 text-right shrink-0">
                    {noCount} ({noPercent}%)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <Users className="w-3 h-3 text-sand-deep" />
                  <span className="text-xs text-sand-deep">
                    {total} {total === 1 ? "response" : "responses"}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
