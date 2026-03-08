import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// protect these routes
const PROTECTED_PREFIXES = ["/app", "/checkout", "/cart"]; // adjust to your needs

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isProtected) return NextResponse.next();

    // Call backend to check session
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: {
                // pass cookie to backend (IMPORTANT)
                cookie: req.headers.get("cookie") || "",
            },
        });

        if (res.ok) return NextResponse.next();
    } catch {
        // ignore
    }

    // not logged in -> send to login and keep where they wanted to go
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: ["/app/:path*", "/checkout/:path*", "/cart/:path*"],
};
