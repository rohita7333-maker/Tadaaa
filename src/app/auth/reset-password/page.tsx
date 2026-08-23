"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Heart, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F6] px-6 py-12">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#3E6B5C] to-[#2E5145] flex items-center justify-center">
          <Heart className="w-4 h-4 fill-white text-white" />
        </div>
        <span className="font-heading text-xl text-[#1A1B18]">TaDaaaa</span>
      </Link>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_4px_24px_rgba(26, 27, 24,0.08)] border border-[#E9E6DF]/30 p-8">
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-2xl text-[#1A1B18]">Set new password</h1>
            <p className="text-[#6F6E68] text-sm mt-1.5">
              Choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[#1A1B18] text-sm font-medium">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="h-12 rounded-2xl border-[#E9E6DF] bg-white focus-visible:ring-[#3E6B5C] focus-visible:border-[#3E6B5C] transition-colors pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F6E68] hover:text-[#1A1B18] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[#3E6B5C] text-xs">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-[#1A1B18] text-sm font-medium">
                Confirm password
              </Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat password"
                className="h-12 rounded-2xl border-[#E9E6DF] bg-white focus-visible:ring-[#3E6B5C] focus-visible:border-[#3E6B5C] transition-colors"
                {...register("confirm")}
              />
              {errors.confirm && (
                <p className="text-[#3E6B5C] text-xs">{errors.confirm.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#3E6B5C] to-[#2E5145] hover:from-[#2E5145] hover:to-[#3E6B5C] text-white font-semibold transition-all duration-300 hover:scale-[1.01] shadow-md shadow-[#3E6B5C]/25 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
