"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function LoginPage() {
    const router = useRouter();
    const params = useSearchParams();

    const loginWithGoogle = () => {
        // ✅ respect next param
        const next = params.get("next") || "/app";
        window.location.href = `${API_URL}/auth/google?returnTo=${encodeURIComponent(
            next
        )}`;
    };

    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/me`, {
                    credentials: "include",
                });

                if (res.ok) {
                    const next = params.get("next") || "/app";
                    router.replace(next); // ✅ NO FLASH
                }
            } catch {
                // ignore
            }
        };
        check();
    }, [router, params]);

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div
                className="pointer-events-none absolute inset-0
        bg-[radial-gradient(55%_45%_at_50%_15%,rgba(239,68,68,0.14),transparent_60%)]"
            />

            <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]
        [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)]
        [background-size:84px_84px]"
            />

            <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="
            w-full max-w-md
            rounded-[28px]
            border border-[color:var(--border)]
            bg-[color:var(--panel-bg)]
            shadow-[var(--shadow)]
            backdrop-blur-2sm
            p-6 sm:p-7
          "
                >
                    <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)]">
                            <Image
                                src="/OC_whiteBG.png"
                                alt="Optimal Clothing"
                                fill
                                className="object-contain logo-light"
                                priority
                            />
                            <Image
                                src="/OC_BLACKBG.png"
                                alt="Optimal Clothing"
                                fill
                                className="object-contain logo-dark"
                                priority
                            />
                        </div>

                        <div>
                            <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">
                                OPTIMAL CLOTHING
                            </p>
                            <h1 className="mt-1 text-xl font-semibold text-[color:var(--foreground)]">
                                Sign in
                            </h1>
                        </div>
                    </div>

                    <p className="mt-4 text-sm text-[color:var(--muted)]">
                        Save your designs, sync your cart, and checkout faster.
                    </p>

                    <button
                        onClick={loginWithGoogle}
                        className="
              mt-6 w-full
              rounded-2xl px-4 py-3
              border border-[color:var(--border)]
              bg-[color:var(--soft-bg)]
              text-[color:var(--foreground)]
              hover:opacity-90 transition
              flex items-center justify-center gap-3
            "
                    >
                        {/* simple google mark (no extra deps) */}
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                            <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.66 1.22 9.14 3.62l6.84-6.84C35.85 2.45 30.34 0 24 0 14.64 0 6.56 5.38 2.65 13.22l7.98 6.19C12.53 13.62 17.84 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.5 24.5c0-1.59-.14-3.12-.41-4.59H24v9.19h12.61c-.55 2.98-2.23 5.51-4.74 7.21l7.28 5.65C43.47 38.22 46.5 31.85 46.5 24.5z" />
                                <path fill="#FBBC05" d="M10.63 28.59A14.4 14.4 0 0 1 9.88 24c0-1.59.28-3.12.75-4.59l-7.98-6.19A23.93 23.93 0 0 0 0 24c0 3.87.93 7.53 2.65 10.78l7.98-6.19z" />
                                <path fill="#34A853" d="M24 48c6.34 0 11.85-2.09 15.8-5.69l-7.28-5.65c-2.02 1.36-4.61 2.16-8.52 2.16-6.16 0-11.47-4.12-13.37-9.91l-7.98 6.19C6.56 42.62 14.64 48 24 48z" />
                            </svg>
                        </span>
                        <span className="text-sm font-medium">Continue with Google</span>
                    </button>

                    <div className="mt-6 h-px w-full bg-[color:var(--border)]" />

                    <p className="mt-4 text-[11px] leading-relaxed text-[color:var(--muted)]">
                        By continuing, you agree to our Terms and acknowledge our Privacy Policy.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
