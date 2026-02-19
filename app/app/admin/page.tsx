import { requireAdmin } from "@/lib/auth-server";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
    const user = await requireAdmin("/app");

    return (
        <div className="min-h-screen px-6 py-10">
            <div className="mx-auto max-w-6xl">
                <AdminDashboardClient user={user} />
            </div>
        </div>
    );
}
