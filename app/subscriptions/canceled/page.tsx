"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function SubscriptionCanceled() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="max-w-lg w-full rounded-[28px] border border-[color:var(--border)]
                bg-[color:var(--panel-bg)] shadow-[var(--shadow)] p-8 text-center">

                <XCircle size={48} className="mx-auto text-red-500" />

                <h1 className="mt-6 text-2xl font-semibold text-[color:var(--foreground)]">
                    Payment Not Completed
                </h1>

                <p className="mt-3 text-sm text-[color:var(--muted)]">
                    Your subscription checkout was canceled or failed.
                    No charges were made.
                </p>

                <div className="mt-6 flex justify-center gap-3">
                    <button
                        onClick={() => router.push("/subscriptions")}
                        className="rounded-full px-6 py-3 text-sm font-medium
                            bg-[color:var(--btn-primary-bg)]
                            text-[color:var(--btn-primary-fg)]
                            hover:opacity-90 transition"
                    >
                        Try Again
                    </button>

                    <button
                        onClick={() => router.push("/app")}
                        className="rounded-full px-6 py-3 text-sm font-medium
                            border border-[color:var(--btn-secondary-border)]
                            bg-[color:var(--btn-secondary-bg)]
                            text-[color:var(--btn-secondary-fg)]
                            hover:opacity-90 transition"
                    >
                        Back to App
                    </button>
                </div>
            </div>
        </div>
    );
}
