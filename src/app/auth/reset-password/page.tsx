"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import {
  AUTH_CARD,
  BTN_CORAL,
  FIELD_INPUT,
  FIELD_INPUT_ERROR,
  FIELD_LABEL,
  FIELD_MSG,
} from "@/components/auth/AuthForm";
import { updatePassword } from "@/actions/auth";
import { toast } from "sonner";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    const fd = new FormData();
    fd.append("password", data.password);
    try {
      const result = await updatePassword(fd);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      }
      // On success, updatePassword redirects to /dashboard server-side
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
        <h1 className="text-[26px] mb-1">Set a new password</h1>
        <p className="text-sm mb-[26px]">
          Choose something you have not used elsewhere.
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label htmlFor="password" className={FIELD_LABEL}>
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="8+ characters"
                className={`${FIELD_INPUT} pr-[68px] ${
                  errors.password ? FIELD_INPUT_ERROR : ""
                }`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-1.5 text-xs text-stone hover:text-ink transition-colors"
              >
                {showPassword ? "hide" : "show"}
              </button>
            </div>
            {errors.password && (
              <p className={FIELD_MSG}>{errors.password.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="confirm" className={FIELD_LABEL}>
              Confirm password
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Same again"
              className={`${FIELD_INPUT} ${errors.confirm ? FIELD_INPUT_ERROR : ""}`}
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className={FIELD_MSG}>{errors.confirm.message}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className={BTN_CORAL}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
