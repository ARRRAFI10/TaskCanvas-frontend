"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you."),
  email: z.email("Enter a valid email address."),
  // Mirrors Django's MinimumLengthValidator; its other validators (too common,
  // all-numeric, too similar to the email) are enforced server-side and surface
  // as a field error on this input.
  password: z.string().min(8, "Use at least 8 characters."),
});

type SignupValues = z.infer<typeof signupSchema>;

/** "Ada Lovelace" -> first "Ada", last "Lovelace"; a single word leaves last blank. */
function splitName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") };
}

export function SignupForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const access = useAuthStore((state) => state.access);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (hasHydrated && access) router.replace("/tasks");
  }, [hasHydrated, access, router]);

  const onSubmit = async (values: SignupValues) => {
    const { first_name, last_name } = splitName(values.name);
    try {
      const session = await api.auth.register({
        email: values.email,
        password: values.password,
        first_name,
        last_name,
      });
      setSession(session); // the endpoint returns tokens — straight in, no second login
      router.replace("/tasks");
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        // Pin server-side messages ("email already exists", "password too common")
        // onto the field they belong to rather than a generic banner.
        const { email, password } = error.errors;
        if (email?.length) setError("email", { message: email[0] });
        if (password?.length) setError("password", { message: password[0] });
        if (!email?.length && !password?.length) {
          setError("root", { message: error.detail });
        }
      } else {
        setError("root", {
          message: "Could not reach the server. Please try again in a moment.",
        });
      }
    }
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
        label="Name"
        type="text"
        placeholder="Ada Lovelace"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
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
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  );
}
