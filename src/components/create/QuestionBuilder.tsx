"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trash2, Plus } from "lucide-react";
import { springs, makeReducedMotionTransition } from "@/lib/motion";
import { LABEL, INPUT, CC, TGLROW, TGLROW_M, TGLROW_H, TGLROW_P } from "./editorial";

export interface Question {
  text: string;
  yesLabel: string;
  noLabel: string;
  requireAnswer: boolean;
  enableDodge: boolean;
}

interface QuestionBuilderProps {
  questions: Question[];
  onQuestionsChange: (q: Question[]) => void;
}

const EMPTY_QUESTION: Question = {
  text: "",
  yesLabel: "Yes",
  noLabel: "No",
  requireAnswer: false,
  enableDodge: true,
};

/**
 * Question step — mockup `w3` (L1176). Each question is a mist-bordered card
 * with `.field` inputs and `.tglrow` + `.sw` switches, matching the mockup's
 * "Dodging No button" row verbatim.
 */
export default function QuestionBuilder({ questions, onQuestionsChange }: QuestionBuilderProps) {
  const MAX_QUESTIONS = 3;
  const shouldReduce = useReducedMotion();

  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) return;
    onQuestionsChange([...questions, { ...EMPTY_QUESTION }]);
  }

  function removeQuestion(index: number) {
    onQuestionsChange(questions.filter((_, i) => i !== index));
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    onQuestionsChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {questions.map((q, i) => (
            <motion.div
              key={i}
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className="rounded-[var(--r-md)] border border-mist bg-paper p-4"
            >
              <div className="mb-3 flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <label htmlFor={`q-text-${i}`} className={LABEL}>
                    Ask a playful question
                  </label>
                  <input
                    id={`q-text-${i}`}
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(i, { text: e.target.value.slice(0, 100) })}
                    placeholder="Save me a seat?"
                    maxLength={100}
                    className={INPUT}
                  />
                  <div className={CC}>{q.text.length}/100</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  aria-label={`Remove question ${i + 1}`}
                  className="mb-[26px] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-mist text-coral-deep transition-colors hover:border-coral-deep hover:bg-chip-coral-bg focus-visible:outline-2 focus-visible:outline-coral focus-visible:outline-offset-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`q-yes-${i}`} className={LABEL}>
                    Yes label
                  </label>
                  <input
                    id={`q-yes-${i}`}
                    value={q.yesLabel}
                    onChange={(e) => updateQuestion(i, { yesLabel: e.target.value.slice(0, 20) })}
                    placeholder="Yes"
                    maxLength={20}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label htmlFor={`q-no-${i}`} className={LABEL}>
                    No label
                  </label>
                  <input
                    id={`q-no-${i}`}
                    value={q.noLabel}
                    onChange={(e) => updateQuestion(i, { noLabel: e.target.value.slice(0, 20) })}
                    placeholder="No"
                    maxLength={20}
                    className={INPUT}
                  />
                </div>
              </div>

              <div className="mt-1">
                <div className={TGLROW}>
                  <div className={TGLROW_M}>
                    <h4 className={TGLROW_H}>Dodging &ldquo;No&rdquo; button</h4>
                    <p className={TGLROW_P}>
                      The No runs away when they reach for it. A classic.
                    </p>
                  </div>
                  <label className="ed-sw">
                    <input
                      type="checkbox"
                      checked={q.enableDodge}
                      onChange={(e) => updateQuestion(i, { enableDodge: e.target.checked })}
                      aria-label={`Dodging No button for question ${i + 1}`}
                    />
                    <span className="ed-tr" />
                  </label>
                </div>

                <div className={TGLROW}>
                  <div className={TGLROW_M}>
                    <h4 className={TGLROW_H}>Require an answer</h4>
                    <p className={TGLROW_P}>They can&rsquo;t skip past it. Good for RSVPs.</p>
                  </div>
                  <label className="ed-sw">
                    <input
                      type="checkbox"
                      checked={q.requireAnswer}
                      onChange={(e) => updateQuestion(i, { requireAnswer: e.target.checked })}
                      aria-label={`Require an answer for question ${i + 1}`}
                    />
                    <span className="ed-tr" />
                  </label>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {questions.length < MAX_QUESTIONS && (
        <button
          type="button"
          onClick={addQuestion}
          className="ed-btn ed-btn-line ed-btn-sm mt-3"
        >
          <Plus className="h-3.5 w-3.5" />
          Add question
          {questions.length > 0 && (
            <span className="text-stone">
              {questions.length}/{MAX_QUESTIONS}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
