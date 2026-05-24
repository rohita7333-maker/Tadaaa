"use client";

import React from "react";
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
      {/* Title — floating label */}
      <div>
        <div className="relative">
          <input
            id="msg-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value.slice(0, MAX_TITLE_LENGTH))}
            placeholder=" "
            aria-label="Title"
            aria-invalid={!!titleError}
            className="peer w-full h-14 rounded-xl border border-[#D4CBC3] bg-white px-3 pt-5 pb-1.5 text-[#2D2926] placeholder:text-transparent focus:border-[#C4686D] focus:outline-none focus:ring-2 focus:ring-[#C4686D]/20 transition-colors"
          />
          <label
            htmlFor="msg-title"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B5E57] text-sm transition-all duration-200 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[#C4686D] peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium"
          >
            Title
          </label>
          <span className="absolute right-3 bottom-1.5 text-[10px] text-[#6B5E57]">
            {title.length}/{MAX_TITLE_LENGTH}
          </span>
        </div>
        {titleError && <p className="text-[#C4686D] text-xs mt-1">{titleError}</p>}
      </div>

      {/* Message — floating label */}
      <div>
        <div className="relative">
          <textarea
            id="msg-message"
            value={message}
            onChange={(e) =>
              onMessageChange(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
            }
            placeholder=" "
            aria-label="Message"
            aria-invalid={!!messageError}
            className="peer w-full min-h-[160px] rounded-xl border border-[#D4CBC3] bg-white px-3 pt-6 pb-6 text-[#2D2926] placeholder:text-transparent focus:border-[#C4686D] focus:outline-none focus:ring-2 focus:ring-[#C4686D]/20 resize-none leading-relaxed transition-colors"
          />
          <label
            htmlFor="msg-message"
            className="pointer-events-none absolute left-3 top-4 text-[#6B5E57] text-sm transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-[#C4686D] peer-focus:font-medium peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium"
          >
            Message
          </label>
          <span
            className={`absolute right-3 bottom-2 text-[10px] ${
              message.length > MAX_MESSAGE_LENGTH * 0.9 ? "text-[#C4686D]" : "text-[#6B5E57]"
            }`}
          >
            {message.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        {messageError && <p className="text-[#C4686D] text-xs mt-1">{messageError}</p>}
      </div>
    </div>
  );
}
