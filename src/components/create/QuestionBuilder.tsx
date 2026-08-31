"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Trash2, Plus, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { springs, makeReducedMotionTransition } from "@/lib/motion";
import { DEFAULT_DODGE_LIMIT, UNLIMITED_DODGES } from "@/lib/dodge";

/** Creator picks how stubborn the No button is: never, a set number, or forever. */
const DODGE_CHOICES: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 1, label: "1" },
  { value: 3, label: "3" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: UNLIMITED_DODGES, label: "∞" },
];

export interface Question {
  text: string;
  yesLabel: string;
  noLabel: string;
  requireAnswer: boolean;
  /** Times No runs away: 0 never, -1 forever. */
  dodgeLimit: number;
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
  dodgeLimit: DEFAULT_DODGE_LIMIT,
};

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
    <div className="bg-white rounded-2xl border border-[#E9E6DF]/40 shadow-[0_4px_16px_rgba(26,27,24,0.04)] p-6">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="w-4 h-4 text-[#3E6B5C]" />
        <h3 className="font-heading text-base text-[#1A1B18]">Questions (Optional)</h3>
      </div>
      <p className="text-xs text-[#6F6E68] mb-5">
        Ask up to 3 YES/NO questions. Customise labels, enable the dodging No button, and see answers in your dashboard.
      </p>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {questions.map((q, i) => (
            <motion.div
              key={i}
              initial={shouldReduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }}
              transition={makeReducedMotionTransition(shouldReduce, springs.soft)}
              className="bg-[#FAF9F6] rounded-2xl border border-[#E9E6DF]/50 p-4 space-y-3"
            >
              {/* Question text */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => updateQuestion(i, { text: e.target.value.slice(0, 100) })}
                    placeholder={`Question ${i + 1}…`}
                    maxLength={100}
                    className="w-full h-10 bg-white rounded-xl border border-[#E9E6DF] px-3 text-sm text-[#1A1B18] placeholder:text-[#E9E6DF] focus:outline-none focus:border-[#3E6B5C] focus:ring-2 focus:ring-[#3E6B5C]/20 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#E9E6DF] pointer-events-none">
                    {q.text.length}/100
                  </span>
                </div>
                <button
                  onClick={() => removeQuestion(i)}
                  className="h-10 w-10 rounded-full border border-[#E9E6DF] text-[#3E6B5C] hover:bg-[#FFF0EE] flex items-center justify-center transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* YES / NO labels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[#6B8F71] uppercase tracking-wider mb-1">
                    YES label
                  </label>
                  <input
                    value={q.yesLabel}
                    onChange={(e) => updateQuestion(i, { yesLabel: e.target.value.slice(0, 20) })}
                    placeholder="Yes"
                    maxLength={20}
                    className="w-full h-9 bg-white rounded-xl border border-[#6B8F71]/40 px-3 text-sm text-[#1A1B18] focus:outline-none focus:border-[#6B8F71] focus:ring-2 focus:ring-[#6B8F71]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#3E6B5C] uppercase tracking-wider mb-1">
                    NO label
                  </label>
                  <input
                    value={q.noLabel}
                    onChange={(e) => updateQuestion(i, { noLabel: e.target.value.slice(0, 20) })}
                    placeholder="No"
                    maxLength={20}
                    className="w-full h-9 bg-white rounded-xl border border-[#3E6B5C]/40 px-3 text-sm text-[#1A1B18] focus:outline-none focus:border-[#3E6B5C] focus:ring-2 focus:ring-[#3E6B5C]/20 transition-all"
                  />
                </div>
              </div>

              {/* How many times No runs away */}
              <div>
                <p className="text-xs text-[#1A1B18] font-medium">Dodging No button 😄</p>
                <p className="text-[10px] text-[#6F6E68] mb-2">
                  {q.dodgeLimit === 0
                    ? "It stays put — they can answer No normally."
                    : q.dodgeLimit === UNLIMITED_DODGES
                      ? "It can never be caught, so the only answer they can give is Yes."
                      : `It runs away ${q.dodgeLimit} time${q.dodgeLimit === 1 ? "" : "s"}, then lets itself be caught.`}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Times the No button runs away">
                  {DODGE_CHOICES.map((choice) => {
                    const active = q.dodgeLimit === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateQuestion(i, { dodgeLimit: choice.value })}
                        className={`h-8 min-w-9 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                          active
                            ? "bg-[#3E6B5C] text-white"
                            : "bg-white border border-[#E9E6DF] text-[#6F6E68] hover:border-[#3E6B5C]"
                        }`}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Require answer toggle */}
              <div className="flex items-center justify-between border-t border-[#E9E6DF]/40 pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#6F6E68]">Require answer to continue</span>
                  <span className="text-[10px] text-[#9B8E87]">If on, they can&apos;t skip — great for RSVPs</span>
                </div>
                <Switch
                  checked={q.requireAnswer}
                  onCheckedChange={(checked) => updateQuestion(i, { requireAnswer: checked })}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {questions.length < MAX_QUESTIONS && (
        <Button
          onClick={addQuestion}
          variant="outline"
          className="mt-4 w-full h-10 rounded-full border-dashed border-[#3E6B5C]/50 text-[#3E6B5C] hover:bg-[#FFF0EE] hover:border-[#3E6B5C] text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Question
          {questions.length > 0 && (
            <span className="ml-auto text-xs text-[#E9E6DF]">
              {questions.length}/{MAX_QUESTIONS}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
