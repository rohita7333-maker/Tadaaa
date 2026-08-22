"use client";

import React, { useRef } from "react";
import { MAX_MESSAGE_LENGTH, MAX_TITLE_LENGTH } from "@/lib/constants";
import EmojiPicker from "./EmojiPicker";
import { LABEL, INPUT, INPUT_ERR, FMSG, CC, WIZ_H2, WIZ_SUB } from "./editorial";

interface MessageEditorProps {
  title: string;
  message: string;
  onTitleChange: (v: string) => void;
  onMessageChange: (v: string) => void;
  titleError?: string;
  messageError?: string;
}

// Insert `insert` at the field's caret (or end), clamp to `max`, and restore
// the caret just after the inserted text so typing can continue naturally.
function insertAtCaret(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  insert: string,
  max: number,
  commit: (v: string) => void
) {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = (current.slice(0, start) + insert + current.slice(end)).slice(0, max);
  commit(next);
  // Caret restore must wait for React to re-render the new value.
  requestAnimationFrame(() => {
    if (!el) return;
    const caret = Math.min(start + insert.length, max);
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}

/**
 * Wizard step 2 heart — mockup `w2` (L1152). Label-above-field `.field`
 * anatomy with an uppercase 11px label, mist hairline, coral focus ring and a
 * right-aligned `.cc` counter. No floating labels: the mockup has none.
 */
export default function MessageEditor({
  title,
  message,
  onTitleChange,
  onMessageChange,
  titleError,
  messageError,
}: MessageEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      <h2 className={WIZ_H2}>Add your words. We&rsquo;ll handle the rest.</h2>
      <p className={WIZ_SUB}>Title, message, photos. The heart of it.</p>

      {/* Title — mockup `.field` with `#wt` */}
      <div className="mb-4">
        <label htmlFor="msg-title" className={LABEL}>
          Who&rsquo;s it for?
        </label>
        <div className="relative">
          <input
            id="msg-title"
            ref={titleRef}
            value={title}
            onChange={(e) => onTitleChange(e.target.value.slice(0, MAX_TITLE_LENGTH))}
            placeholder="Maya turns thirty"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? "msg-title-err" : undefined}
            className={`${INPUT} pr-12 ${titleError ? INPUT_ERR : ""}`}
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <EmojiPicker
              label="Insert emoji into title"
              onPick={(emoji) =>
                insertAtCaret(titleRef.current, title, emoji, MAX_TITLE_LENGTH, onTitleChange)
              }
            />
          </div>
        </div>
        <div className={CC}>
          {title.length}/{MAX_TITLE_LENGTH}
        </div>
        {titleError && (
          <p id="msg-title-err" className={FMSG}>
            {titleError}
          </p>
        )}
      </div>

      {/* Message — mockup `.field` with `#wm` + `.cc` counter */}
      <div className="mb-4">
        <label htmlFor="msg-message" className={LABEL}>
          What do you want to say?
        </label>
        <div className="relative">
          <textarea
            id="msg-message"
            ref={messageRef}
            value={message}
            onChange={(e) => onMessageChange(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="The thing you've been meaning to say."
            rows={5}
            aria-invalid={!!messageError}
            aria-describedby={messageError ? "msg-message-err" : undefined}
            className={`${INPUT} pr-12 resize-none leading-relaxed ${
              messageError ? INPUT_ERR : ""
            }`}
          />
          <div className="absolute right-1.5 top-2">
            <EmojiPicker
              label="Insert emoji into message"
              onPick={(emoji) =>
                insertAtCaret(
                  messageRef.current,
                  message,
                  emoji,
                  MAX_MESSAGE_LENGTH,
                  onMessageChange
                )
              }
            />
          </div>
        </div>
        <div className={CC}>
          {message.length}/{MAX_MESSAGE_LENGTH}
        </div>
        {messageError && (
          <p id="msg-message-err" className={FMSG}>
            {messageError}
          </p>
        )}
      </div>
    </div>
  );
}
