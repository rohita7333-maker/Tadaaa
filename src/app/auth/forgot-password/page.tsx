"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  AUTH_CARD,
  BTN_INK,
  FIELD_INPUT,
  FIELD_INPUT_ERROR,
  FIELD_LABEL,
  FIELD_MSG,
  TLINK,
} from "@/components/auth/AuthForm";
import { sendPasswordReset } from "@/actions/auth";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    const fd = new FormData();
    fd.append("email", data.email);
    try {
      const result = await sendPasswordReset(fd);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        setSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center px-6 py-14">
      <Link href="/" className="font-heading text-xl text-ink mb-10">
        TaDaaaa<span className="text-coral">.</span>
      </Link>

      <div className={AUTH_CARD}>
        {sent ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone">
              Reset link sent
            </p>
            <h1 className="text-[26px] mt-1 mb-1">Check your email</h1>
            <p className="text-sm mb-[26px]">
              We sent a reset link to{" "}
              <span className="text-ink font-semibold">{getValues("email")}</span>.
              It expires in an hour.
            </p>
            <Link href="/auth/signin" className={TLINK}>
              ← Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-[26px] mb-1">Forgot password?</h1>
            <p className="text-sm mb-[26px]">
              Enter your email and we&apos;ll send a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-4">
                <label htmlFor="email" className={FIELD_LABEL}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${FIELD_INPUT} ${errors.email ? FIELD_INPUT_ERROR : ""}`}
                  {...register("email")}
                />
                {errors.email && <p className={FIELD_MSG}>{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={loading} className={BTN_INK}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-3.5 text-[13px] text-center text-stone">
              <Link href="/auth/signin" className={TLINK}>
                ← Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
