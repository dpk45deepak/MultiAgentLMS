"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Eye,
    EyeOff,
    Mail,
    Lock,
    Loader2,
    CheckCircle2,
    MailCheck,
    ArrowLeft,
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

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendNotice, setResendNotice] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const isLengthValid = password.length >= 8;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!isLengthValid) {
            setError("Use a password with at least 8 characters.");
            return;
        }

        setLoading(true);
        const supabase = createClient();
        const { error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/api/auth/callback`,
            },
        });
        setLoading(false);

        if (signUpError) {
            setError(
                signUpError.message.toLowerCase().includes("already registered")
                    ? "An account with this email already exists."
                    : "We couldn\u2019t create your account. Please try again.",
            );
            return;
        }

        setSubmitted(true);
        setResendCooldown(30);
    }

    async function resend() {
        if (resendCooldown > 0) return;
        setResending(true);
        setResendNotice(null);

        const supabase = createClient();
        const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email: email.trim(),
            options: {
                emailRedirectTo: `${window.location.origin}/api/auth/callback`,
            },
        });

        setResending(false);

        if (resendError) {
            setResendNotice({
                type: "error",
                text: "We couldn\u2019t resend right now. Please try again in a minute.",
            });
        } else {
            setResendNotice({
                type: "success",
                text: "Sent! Check your inbox (and spam).",
            });
            setResendCooldown(60);
        }
    }

    return (
        <div className="min-h-screen w-full text-ink lg:grid lg:grid-cols-12">
            {/* LEFT PANEL: Showcase using exact original palette */}
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
                            Free to start &mdash; no credit card
                        </span>
                        <h2 className="text-3xl font-bold tracking-tight text-ink xl:text-4xl">
                            Set up your workspace in under a minute.
                        </h2>
                        <p className="text-sm leading-relaxed text-ink-soft">
                            Everything you need organized in one calm, reliable
                            place. Start free and upgrade only when your
                            workflow demands it.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3.5 rounded-xl border border-[#D7EAFB] bg-background/80 p-4">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D7EAFB]/50 text-navy-muted">
                                <Zap className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink">
                                    Instant access
                                </h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                                    Verify your email once and jump straight in
                                    across all your devices.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3.5 rounded-xl border border-[#D7EAFB] bg-background/80 p-4">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#388E3C]/10 text-[#388E3C]">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-ink">
                                    Private by default
                                </h3>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
                                    Your data stays yours with encrypted
                                    authentication and zero spam.
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

            {/* RIGHT PANEL: Registration Form / Confirmation */}
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
                        {submitted
                            ? "Already confirmed?"
                            : "Already have an account?"}{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-navy-muted underline decoration-[#D7EAFB] decoration-2 underline-offset-4 transition-colors hover:text-ink"
                        >
                            Log in
                        </Link>
                    </p>
                </header>

                <div className="mx-auto my-auto w-full max-w-[420px] py-10">
                    {submitted ? (
                        /* CONFIRMATION STATE */
                        <div className="rounded-2xl border border-[#D7EAFB] bg-card p-7 shadow-xs sm:p-8">
                            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#D7EAFB] bg-[#D7EAFB]/35 text-navy-muted">
                                <MailCheck className="h-6 w-6" />
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-ink">
                                Check your inbox
                            </h1>
                            <p className="mt-1.5 text-sm text-ink-soft">
                                Almost there. We sent a confirmation link to:
                            </p>

                            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[#D7EAFB] bg-[#D7EAFB]/20 px-3.5 py-2.5">
                                <span className="truncate text-sm font-semibold text-ink">
                                    {email}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubmitted(false);
                                        setResendNotice(null);
                                    }}
                                    className="shrink-0 text-xs font-semibold text-navy-muted hover:text-ink"
                                >
                                    Edit
                                </button>
                            </div>

                            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                                Click the link to activate your account &mdash;
                                you&rsquo;ll be signed in automatically. (If you
                                open it on a different device, just log in there
                                afterwards.)
                            </p>

                            {resendNotice && (
                                <div className="mt-4">
                                    {resendNotice.type === "success" ? (
                                        <p
                                            role="status"
                                            aria-live="polite"
                                            className="flex items-center gap-1.5 text-sm font-semibold text-[#388E3C]"
                                        >
                                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                                            <span>{resendNotice.text}</span>
                                        </p>
                                    ) : (
                                        <Alert variant="destructive">
                                            {resendNotice.text}
                                        </Alert>
                                    )}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col gap-2.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-full border-[#D7EAFB] text-ink hover:bg-[#D7EAFB]/25"
                                    onClick={resend}
                                    disabled={resending || resendCooldown > 0}
                                >
                                    {resending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending&hellip;
                                        </>
                                    ) : resendCooldown > 0 ? (
                                        `Resend available in ${resendCooldown}s`
                                    ) : (
                                        "Resend confirmation email"
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSubmitted(false);
                                        setResendNotice(null);
                                    }}
                                    className="mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
                                >
                                    <ArrowLeft className="h-3.5 w-3.5" />
                                    Wrong email? Try again
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* REGISTRATION FORM STATE */
                        <div>
                            <div className="mb-7">
                                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                                    Create your account
                                </h1>
                                <p className="mt-1.5 text-sm text-ink-soft">
                                    Free to start &mdash; no credit card.
                                </p>
                            </div>

                            <div className="flex flex-col gap-5">
                                <GoogleButton
                                    next="/register"
                                    onError={setError}
                                />

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
                                        <Alert variant="destructive">
                                            {error}
                                        </Alert>
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
                                        <Label
                                            htmlFor="password"
                                            className="text-xs font-semibold text-ink"
                                        >
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                                            <Input
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="Create a password"
                                                required
                                                autoComplete="new-password"
                                                value={password}
                                                onChange={(e) =>
                                                    setPassword(e.target.value)
                                                }
                                                className="h-11 rounded-xl border-[#D7EAFB] pl-10 pr-10 text-ink placeholder:text-ink-faint"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (prev) => !prev,
                                                    )
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

                                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                                            <CheckCircle2
                                                className={`h-3.5 w-3.5 transition-colors ${
                                                    isLengthValid
                                                        ? "text-[#388E3C]"
                                                        : "text-ink-faint"
                                                }`}
                                            />
                                            <span
                                                className={
                                                    isLengthValid
                                                        ? "font-medium text-[#388E3C]"
                                                        : "text-ink-faint"
                                                }
                                            >
                                                At least 8 characters.
                                            </span>
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
                                                Creating account&hellip;
                                            </>
                                        ) : (
                                            "Create account"
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="text-center text-xs text-ink-faint lg:text-left">
                    By creating an account, you agree to our Terms of Service
                    &amp; Privacy Policy.
                </footer>
            </main>
        </div>
    );
}
