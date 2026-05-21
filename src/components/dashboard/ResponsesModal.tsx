"use client";

import { useState, useEffect } from "react";
import { MessageCircleQuestion, ThumbsUp, ThumbsDown, Users } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { getInviteResponses } from "@/actions/questions";
import { type QuestionWithAnswers } from "@/lib/types";

interface ResponsesModalProps {
  inviteId: string;
  open: boolean;
  onClose: () => void;
}

export default function ResponsesModal({ inviteId, open, onClose }: ResponsesModalProps) {
  const [questions, setQuestions] = useState<QuestionWithAnswers[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Sync external state (Supabase fetch) → React. The lint rule allows
    // setState in effects when the call is async; mark cancelled to ignore
    // a stale resolve after unmount or modal close.
    (async () => {
      setLoading(true);
      try {
        const data = await getInviteResponses(inviteId);
        if (!cancelled) setQuestions(data);
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
          <MessageCircleQuestion className="w-4 h-4 text-[#C4686D]" />
          <DialogTitle>Question Responses</DialogTitle>
        </div>
      </DialogHeader>

      <DialogBody className="max-h-[70vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div
              className="w-6 h-6 rounded-full border-2 border-[#D4CBC3] border-t-[#C4686D] animate-spin"
              aria-label="Loading"
            />
          </div>
        )}

        {!loading && (!questions || questions.length === 0) && (
          <div className="text-center py-10">
            <MessageCircleQuestion className="w-10 h-10 text-[#D4CBC3] mx-auto mb-3" />
            <p className="text-sm text-[#6B5E57] font-medium">No questions yet</p>
            <p className="text-xs text-[#D4CBC3] mt-1">
              Add questions in your invite to collect responses.
            </p>
          </div>
        )}

        {!loading && questions && questions.length > 0 && (
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
                  className="bg-[#FFF8F0] rounded-2xl border border-[#D4CBC3]/40 p-4"
                >
                  <p className="text-sm font-medium text-[#2D2926] mb-3 leading-snug">
                    {q.question_text}
                  </p>

                  {total === 0 ? (
                    <p className="text-xs text-[#D4CBC3]">No responses yet</p>
                  ) : (
                    <div className="space-y-2">
                      {/* YES row */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-16 shrink-0">
                          <ThumbsUp className="w-3 h-3 text-[#5aaa69]" />
                          <span className="text-xs font-medium text-[#2D2926]">Yes</span>
                        </div>
                        <div className="flex-1 h-2 bg-[#D4CBC3]/30 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${yesPercent}%`,
                              backgroundColor: "#5aaa69",
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#6B5E57] w-12 text-right shrink-0">
                          {yesCount} ({yesPercent}%)
                        </span>
                      </div>

                      {/* NO row */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-16 shrink-0">
                          <ThumbsDown className="w-3 h-3 text-[#C4686D]" />
                          <span className="text-xs font-medium text-[#2D2926]">No</span>
                        </div>
                        <div className="flex-1 h-2 bg-[#D4CBC3]/30 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${noPercent}%`,
                              backgroundColor: "#C4686D",
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#6B5E57] w-12 text-right shrink-0">
                          {noCount} ({noPercent}%)
                        </span>
                      </div>

                      {/* Total */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Users className="w-3 h-3 text-[#D4CBC3]" />
                        <span className="text-xs text-[#D4CBC3]">
                          {total} {total === 1 ? "response" : "responses"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogBody>
    </Dialog>
  );
}
