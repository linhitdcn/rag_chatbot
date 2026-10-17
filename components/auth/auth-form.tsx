"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfiguredClient } from "@/lib/supabase/config";
import {
  forgotSchema, loginSchema, signupSchema,
  type ForgotValues, type LoginValues, type SignupValues,
} from "@/lib/validations/auth";

type Mode = "login" | "signup" | "forgot";

function Field({ id, label, error, children, hint }: { id: string; label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {hint}
      </div>
      {children}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const schema = mode === "login" ? loginSchema : mode === "signup" ? signupSchema : forgotSchema;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(schema) as never,
  });

  async function onSubmit(values: LoginValues | SignupValues | ForgotValues) {
    // Demo mode: no Supabase configured, just let the reviewer into the UI.
    if (!isSupabaseConfiguredClient) {
      toast.info("Demo mode — Supabase isn't configured, using mock data.");
      router.push(mode === "forgot" ? "/login" : "/dashboard");
      return;
    }
    const supabase = createClient();
    if (mode === "login") {
      const v = values as LoginValues;
      const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
      if (error) return void toast.error(error.message);
      router.push("/dashboard");
      router.refresh();
    } else if (mode === "signup") {
      const v = values as SignupValues;
      const { error } = await supabase.auth.signUp({
        email: v.email, password: v.password,
        options: { data: { full_name: v.name }, emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) return void toast.error(error.message);
      toast.success("Account created. Check your inbox to confirm your email.");
      router.push("/dashboard");
    } else {
      const v = values as ForgotValues;
      const { error } = await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: `${location.origin}/auth/callback?next=/settings/general` });
      if (error) return void toast.error(error.message);
      toast.success("Password reset link sent. Check your inbox.");
    }
  }

  async function google() {
    if (!isSupabaseConfiguredClient) return void toast.info("Google sign-in needs Supabase configured.");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google", options: { redirectTo: `${location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) toast.error(error.message);
  }

  const copy = {
    login: { title: "Welcome back", sub: "Sign in to manage your chatbots.", cta: "Sign in" },
    signup: { title: "Create your account", sub: "Start building your first RAG chatbot in minutes.", cta: "Create account" },
    forgot: { title: "Reset your password", sub: "We'll email you a link to set a new one.", cta: "Send reset link" },
  }[mode];

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.sub}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {mode === "signup" && (
          <Field id="name" label="Full name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
          </Field>
        )}
        <Field id="email" label="Email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        {mode !== "forgot" && (
          <Field
            id="password" label="Password" error={errors.password?.message}
            hint={mode === "login" && <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>}
          >
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={!!errors.password} {...register("password")} />
          </Field>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} {copy.cta}
        </Button>
      </form>

      {mode !== "forgot" && (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" && <>New here? <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/signup">Create an account</Link></>}
        {mode === "signup" && <>Already have an account? <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">Sign in</Link></>}
        {mode === "forgot" && <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">Back to sign in</Link>}
      </p>
    </div>
  );
}
