"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_CREDENTIALS = { email: "demo@taskcanvas.app", password: "TaskCanvas#2026" };

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const access = useAuthStore((state) => state.access);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Covers client-side navigations to /login; server requests are proxy-redirected.
  useEffect(() => {
    if (hasHydrated && access) router.replace("/tasks");
  }, [hasHydrated, access, router]);

  const onSubmit = async (values: LoginValues) => {
    try {
      const session = await api.auth.login(values);
      setSession(session);
      router.replace("/tasks");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError("root", { message: "Invalid email or password." });
      } else {
        setError("root", {
          message: "Could not reach the server. Please try again in a moment.",
        });
      }
    }
  };

  const fillDemo = () => {
    setValue("email", DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue("password", DEMO_CREDENTIALS.password, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {errors.root && (
        <div className="flex items-center gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" />
          {errors.root.message}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Sign in
      </Button>

      <button
        type="button"
        onClick={fillDemo}
        className="mx-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted transition-colors hover:text-accent"
      >
        <KeyRound className="size-3.5" />
        Use demo credentials
      </button>
    </form>
  );
}
