"use client";

import AdminDashboardClient from "./AdminDashboardClient";
import { useAuth } from "@/services/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase().trim();

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace("/login?next=/app/admin");
            return;
        }

        const email = (user.email || "").toLowerCase().trim();
        if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
            router.replace("/app");
        }
    }, [loading, user, router]);

    if (loading || !user) return null;

    const email = (user.email || "").toLowerCase().trim();
    if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) return null;

    return (
        <div className="min-h-screen px-6 py-10">
            <div className="mx-auto max-w-6xl">
                <AdminDashboardClient user={user} />
            </div>
        </div>
    );
}
