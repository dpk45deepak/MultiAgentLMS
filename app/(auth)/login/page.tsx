"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Eye,
    EyeOff,
    Mail,
    Lock,
    Loader2,
    ShieldCheck,
    Sparkles,
    Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password) {
            setError("Please enter both your email and password.");
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        setLoading(false);

        if (signInError) {
            setError(
                signInError.message
                    .toLowerCase()
                    .includes("email not confirmed")
                    ? "Please verify your email address before logging in."
                    : "Invalid email or password. Please try again.",
            );
            return;
        }

        router.push("/dashboard");
        router.refresh();
    }

    return (
        <div className="min-h-screen w-full text-ink lg:grid lg:grid-cols-12">
            {/* LEFT PANEL: Matching Brand & Value Showcase */}
            <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-[#D7EAFB] bg-[#D7EAFB]/25 p-10 lg:col-span-5 lg:flex xl:p-14">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#D7EAFB]/60 blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#D7EAFB]/50 blur-3xl"
                />

                {/* Top Brand Slot */}
                <div className="relative z-10 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D7EAFB] bg-background shadow-2xs">
                        <Sparkles className="h-4 w-4 text-navy-muted" />
                    </div>
                    <span className="text-base font-bold tracking-tight text-ink">
                        MultiAgentLMS
                    </span>
                </div>

                {/* Middle Feature Highlights */}
                <div className="relative z-10 my-auto max-w-md space-y-8">
                    <div className="space-y-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D7EAFB] bg-background/90 px-3 py-1 text-xs font-semibold text-navy-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#388E3C]" />
                            Welcome back to your workspace
                        </span>
                        <h2 className="text-3xl font-bold tracking-tight text-ink xl:text-4xl">
                            Pick up right where you left off.
                        </h2>
                        <p className="text-sm leading-relaxed text-ink-soft">
                            Your courses, AI agents, and progress are synced and
                            ready whenever you sign in.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3.5 rounded-xl border border-[#D7EAFB] bg-background/80 p-4">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D7EAFB]/50 text-navy-muted">
                                <Zap className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink">
                                    Seamless sync
                                </h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                                    Continue learning across desktop and mobile
                                    without losing your place.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5 rounded-xl border border-[#D7EAFB] bg-background/80 p-4">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#388E3C]/10 text-[#388E3C]">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink">
                                    Encrypted sessions
                                </h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                                    Protected sign-in keeping your workspace and
                                    learning history private.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer */}
                <div className="relative z-10 flex items-center justify-between border-t border-[#D7EAFB] pt-6 text-xs text-navy-muted">
                    <span>Trusted by creators &amp; teams</span>
                    <span className="font-semibold text-[#388E3C]">
                        100% Free Tier
                    </span>
                </div>
            </aside>

            {/* RIGHT PANEL: Login Form */}
            <main className="flex min-h-screen flex-col justify-between px-6 py-8 sm:px-12 lg:col-span-7 lg:px-16">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:invisible">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7EAFB] bg-[#D7EAFB]/30">
                            <Sparkles className="h-4 w-4 text-navy-muted" />
                        </div>
                        <span className="text-sm font-bold text-ink">
                            MultiAgentLMS
                        </span>
                    </div>

                    <p className="text-xs text-ink-soft sm:text-sm">
                        Don&rsquo;t have an account?{" "}
                        <Link
                            href="/register"
                            className="font-semibold text-navy-muted underline decoration-[#D7EAFB] decoration-2 underline-offset-4 transition-colors hover:text-ink"
                        >
                            Sign up
                        </Link>
                    </p>
                </header>

                <div className="mx-auto my-auto w-full max-w-[420px] py-10">
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                            Welcome back
                        </h1>
                        <p className="mt-1.5 text-sm text-ink-soft">
                            Log in to your MultiAgentLMS account.
                        </p>
                    </div>

                    <div className="flex flex-col gap-5">
                        <GoogleButton next="/dashboard" onError={setError} />

                        <div className="flex items-center gap-3 text-xs font-semibold text-navy-muted">
                            <span className="h-px flex-1 bg-[#D7EAFB]" />
                            <span>or continue with email</span>
                            <span className="h-px flex-1 bg-[#D7EAFB]" />
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col gap-4"
                        >
                            {error && (
                                <Alert variant="destructive">{error}</Alert>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-semibold text-ink"
                                >
                                    Email
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        className="h-11 rounded-xl border-[#D7EAFB] pl-10 text-ink placeholder:text-ink-faint"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs font-semibold text-ink"
                                    >
                                        Password
                                    </Label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-xs font-semibold text-navy-muted transition-colors hover:text-ink"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                                    <Input
                                        id="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Enter your password"
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="h-11 rounded-xl border-[#D7EAFB] pl-10 pr-10 text-ink placeholder:text-ink-faint"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-faint transition-colors hover:text-ink"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="mt-2 h-11 w-full rounded-xl font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Logging in&hellip;
                                    </>
                                ) : (
                                    "Log in"
                                )}
                            </Button>
                        </form>
                    </div>
                </div>

                <footer className="text-center text-xs text-ink-faint lg:text-left">
                    Protected by MultiAgentLMS authentication.
                </footer>
            </main>
        </div>
    );
}
