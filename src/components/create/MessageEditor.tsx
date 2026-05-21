"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_MESSAGE_LENGTH, MAX_TITLE_LENGTH } from "@/lib/constants";

interface MessageEditorProps {
  title: string;
  message: string;
  onTitleChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  titleError?: string;
  messageError?: string;
}

export default function MessageEditor({
  title,
  message,
  onTitleChange,
  onMessageChange,
  titleError,
  messageError,
}: MessageEditorProps) {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-[#2D2926] font-medium text-sm">Title</Label>
          <span className="text-[#6B5E57] text-xs">
            {title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        <Input
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTitleChange(e.target.value.slice(0, MAX_TITLE_LENGTH))}
          placeholder="e.g. Happy Mother's Day, Mom ❤️"
          className="h-12 rounded-xl border-[#D4CBC3] focus:border-[#C4686D] focus:ring-[#C4686D] text-[#2D2926]"
        />
        {titleError && (
          <p className="text-[#C4686D] text-xs mt-1">{titleError}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-[#2D2926] font-medium text-sm">Message</Label>
          <span
            className={`text-xs ${
              message.length > MAX_MESSAGE_LENGTH * 0.9
                ? "text-[#C4686D]"
                : "text-[#6B5E57]"
            }`}
          >
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <Textarea
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onMessageChange(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
          }
          placeholder="Write something from the heart…"
          className="min-h-[140px] rounded-xl border-[#D4CBC3] focus:border-[#C4686D] focus:ring-[#C4686D] text-[#2D2926] resize-none leading-relaxed"
        />
        {messageError && (
          <p className="text-[#C4686D] text-xs mt-1">{messageError}</p>
        )}
      </div>
    </div>
  );
}
