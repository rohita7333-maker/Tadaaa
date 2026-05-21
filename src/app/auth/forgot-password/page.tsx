"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Heart, Loader2, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF8F0] px-6 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C4686D] to-[#9B3D42] flex items-center justify-center">
          <Heart className="w-4 h-4 fill-white text-white" />
        </div>
        <span className="font-heading text-xl text-[#2D2926]">TaDaaaa</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_4px_24px_rgba(45,41,38,0.08)] border border-[#D4CBC3]/30 p-8">
        {sent ? (
          /* Success state */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFF0E8] to-[#F5EDE3] flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-[#C4686D]" />
            </div>
            <h1 className="font-heading text-2xl text-[#2D2926]">Check your email</h1>
            <p className="text-[#6B5E57] text-sm leading-relaxed">
              We sent a reset link to{" "}
              <span className="font-semibold text-[#2D2926]">{getValues("email")}</span>.
              It expires in 1 hour.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 text-sm text-[#C4686D] hover:underline font-medium mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          /* Form state */
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-2xl text-[#2D2926]">Forgot password?</h1>
              <p className="text-[#6B5E57] text-sm mt-1.5">
                Enter your email and we&apos;ll send a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[#2D2926] text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-12 rounded-2xl border-[#D4CBC3] bg-white focus-visible:ring-[#C4686D] focus-visible:border-[#C4686D] transition-colors"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-[#C4686D] text-xs">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#C4686D] to-[#9B3D42] hover:from-[#9B3D42] hover:to-[#C4686D] text-white font-semibold transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#C4686D]/25 mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send reset link
              </Button>
            </form>

            <Link
              href="/auth/signin"
              className="flex items-center justify-center gap-2 text-sm text-[#6B5E57] hover:text-[#C4686D] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
