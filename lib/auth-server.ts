import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();

export type AuthUser = {
    id: string;
    email: string;
    name: string;
    avatar?: string;
};

type CookieItem = { name: string; value: string };

async function buildCookieHeader() {
    // Next 16.1+ -> cookies() can be a Promise
    const store = await cookies();

    // Some versions expose getAll(); fallback to empty
    const list = (typeof (store as any).getAll === "function"
        ? ((store as any).getAll() as CookieItem[])
        : []) as CookieItem[];

    return list.map((c: CookieItem) => `${c.name}=${c.value}`).join("; ");
}

async function fetchMe() {
    const cookieHeader = await buildCookieHeader();

    const res = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        cache: "no-store",
    });

    return res;
}

export async function requireUser(nextPath: string) {
    const res = await fetchMe();

    if (!res.ok) {
        redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    const data = (await res.json()) as { user: AuthUser | null };
    if (!data?.user) {
        redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    return data.user;
}

export async function requireAdmin(denyTo = "/app") {
    const user = await requireUser("/app/admin");

    const email = (user.email || "").toLowerCase().trim();
    if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
        redirect(denyTo);
    }

    return user;
}
