"use client";

import { Trash2, Plus, HelpCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

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

export default function QuestionBuilder({ questions, onQuestionsChange }: QuestionBuilderProps) {
  const MAX_QUESTIONS = 3;

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
    <div className="bg-white rounded-2xl border border-[#D4CBC3]/40 shadow-[0_4px_16px_rgba(45,41,38,0.04)] p-6">
      <div className="flex items-center gap-2 mb-1">
        <HelpCircle className="w-4 h-4 text-[#C4686D]" />
        <h3 className="font-heading text-base text-[#2D2926]">Questions (Optional)</h3>
      </div>
      <p className="text-xs text-[#6B5E57] mb-5">
        Ask up to 3 YES/NO questions. Customise labels, enable the dodging No button, and see answers in your dashboard.
      </p>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="bg-[#FFF8F0] rounded-2xl border border-[#D4CBC3]/50 p-4 space-y-3">
            {/* Question text */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(i, { text: e.target.value.slice(0, 100) })}
                  placeholder={`Question ${i + 1}…`}
                  maxLength={100}
                  className="w-full h-10 bg-white rounded-xl border border-[#D4CBC3] px-3 text-sm text-[#2D2926] placeholder:text-[#D4CBC3] focus:outline-none focus:border-[#C4686D] focus:ring-2 focus:ring-[#C4686D]/20 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#D4CBC3] pointer-events-none">
                  {q.text.length}/100
                </span>
              </div>
              <button
                onClick={() => removeQuestion(i)}
                className="h-10 w-10 rounded-full border border-[#D4CBC3] text-[#C4686D] hover:bg-[#FFF0EE] flex items-center justify-center transition-all shrink-0"
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
                  className="w-full h-9 bg-white rounded-xl border border-[#6B8F71]/40 px-3 text-sm text-[#2D2926] focus:outline-none focus:border-[#6B8F71] focus:ring-2 focus:ring-[#6B8F71]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#C4686D] uppercase tracking-wider mb-1">
                  NO label
                </label>
                <input
                  value={q.noLabel}
                  onChange={(e) => updateQuestion(i, { noLabel: e.target.value.slice(0, 20) })}
                  placeholder="No"
                  maxLength={20}
                  className="w-full h-9 bg-white rounded-xl border border-[#C4686D]/40 px-3 text-sm text-[#2D2926] focus:outline-none focus:border-[#C4686D] focus:ring-2 focus:ring-[#C4686D]/20 transition-all"
                />
              </div>
            </div>

            {/* Dodge toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#2D2926] font-medium">Dodging No button 😄</p>
                <p className="text-[10px] text-[#6B5E57]">No button runs away on desktop hover</p>
              </div>
              <Switch
                checked={q.enableDodge}
                onCheckedChange={(checked) => updateQuestion(i, { enableDodge: checked })}
              />
            </div>

            {/* Require answer toggle */}
            <div className="flex items-center justify-between border-t border-[#D4CBC3]/40 pt-3">
              <span className="text-xs text-[#6B5E57]">Require answer to continue</span>
              <Switch
                checked={q.requireAnswer}
                onCheckedChange={(checked) => updateQuestion(i, { requireAnswer: checked })}
              />
            </div>
          </div>
        ))}
      </div>

      {questions.length < MAX_QUESTIONS && (
        <Button
          onClick={addQuestion}
          variant="outline"
          className="mt-4 w-full h-10 rounded-full border-dashed border-[#C4686D]/50 text-[#C4686D] hover:bg-[#FFF0EE] hover:border-[#C4686D] text-sm font-medium transition-all"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Question
          {questions.length > 0 && (
            <span className="ml-auto text-xs text-[#D4CBC3]">
              {questions.length}/{MAX_QUESTIONS}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
