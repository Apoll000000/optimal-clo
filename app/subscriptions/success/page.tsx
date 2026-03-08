"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

function SubscriptionSuccessContent() {
    const params = useSearchParams();
    const router = useRouter();

    const sessionId = params.get("session_id");

    useEffect(() => {
        if (!sessionId) {
            router.replace("/subscriptions");
        }
    }, [sessionId, router]);

    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-lg w-full rounded-[28px] border border-[color:var(--border)]
                bg-[color:var(--panel-bg)] shadow-[var(--shadow)] p-8 text-center">

                <CheckCircle2 size={48} className="mx-auto text-green-500" />

                <h1 className="mt-6 text-2xl font-semibold text-[color:var(--foreground)]">
                    Payment Successful 🎉
                </h1>

                <p className="mt-3 text-sm text-[color:var(--muted)]">
                    Your subscription is now active. You can start enjoying your Pro benefits.
                </p>

                <button
                    onClick={() => router.push("/app")}
                    className="mt-6 rounded-full px-6 py-3 text-sm font-medium
                        bg-[color:var(--btn-primary-bg)]
                        text-[color:var(--btn-primary-fg)]
                        hover:opacity-90 transition"
                >
                    Go to Dashboard
                </button>
            </div>
        </div>
    );
}

export default function SubscriptionSuccess() {
    return (
        <Suspense fallback={null}>
            <SubscriptionSuccessContent />
        </Suspense>
    );
}
