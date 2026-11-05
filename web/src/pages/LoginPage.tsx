import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginApi, ApiError } from "@/lib/api";
import type { User } from "@/types/user";

const DEMO_USER = "ernest";
const DEMO_PASSWORD = "Password1";

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError("Please enter both username/email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { user } = await loginApi({ username: trimmedUser, password });
      onLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to sign in. Please verify your credentials.");
      setIsSubmitting(false);
    }
  }

  function fillDemoCredentials() {
    setUsername(DEMO_USER);
    setPassword(DEMO_PASSWORD);
    setError("");
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-6 bg-muted/20">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8">
        <Logo size="lg" />

        <Card className="w-full border-border/60 shadow-lg shadow-black/[0.04]">
          <CardHeader className="space-y-1.5 text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Welcome to Home Care
            </CardTitle>
            <CardDescription>
              Sign in with your company account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="ernest or ernest.bonat@gmail.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={Boolean(error)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-muted-foreground text-xs font-medium hover:text-primary"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error)}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-9 items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked === true)}
                />
                <Label htmlFor="remember" className="text-muted-foreground font-normal">
                  Remember me
                </Label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div
          className={cn(
            "w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground",
          )}
        >
          <p className="font-medium text-foreground/80">BioGenAI Solutions (Demo Access)</p>
          <p className="mt-1">
            Username: <span className="font-semibold text-foreground">ernest</span> &middot; Password: <span className="font-semibold text-foreground">Password1</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Email: ernest.bonat@gmail.com &middot; Exp: Dec 31, 2027
          </p>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="mt-2 font-medium text-primary hover:underline"
          >
            Autofill BioGenAI Account
          </button>
        </div>
      </div>
    </div>
  );
}
