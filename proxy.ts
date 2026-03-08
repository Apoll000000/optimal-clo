import { NextResponse } from "next/server";

export async function proxy() {
    // Backend session cookie is on backend domain, so server-side proxy checks
    // from frontend domain cannot reliably read auth state.
    return NextResponse.next();
}
