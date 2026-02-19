"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import {
    ShoppingCart,
    Menu,
    LogOut,
    User as UserIcon,
    Settings as SettingsIcon,
    Shield,
    ChevronDown,
} from "lucide-react";
import { AuthUser } from "@/services/auth";
import { getCart } from "@/services/cart";
import { api } from "@/lib/api";

type Props = {
    user?: AuthUser | null;
    cartCount?: number; // optional: used as initial/fallback
    onLogout?: () => void;
};

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase().trim();

// ✅ Global event name (same as AppHome)
const CART_EVENT = "optimal:cart-updated";

type PlanKey = "deluxe" | "grand" | "royalty";

type MySubscription = {
    tier?: PlanKey;
    billingCycle?: "monthly" | "annual";
    status?: string;
    endsAt?: string | Date | null;
    cancelAtPeriodEnd?: boolean;
};

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

function isActiveLikeStatus(status?: string) {
    const s = String(status || "").toLowerCase();
    return ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(s);
}

export default function AppTopBar({ user, cartCount = 0, onLogout }: Props) {
    const [open, setOpen] = useState(false); // mobile hamburger dropdown
    const [userOpen, setUserOpen] = useState(false); // desktop user dropdown

    // ✅ live cart badge count (source of truth)
    const [liveCartCount, setLiveCartCount] = useState<number>(cartCount);

    // ✅ subscription (for tier accent)
    const [mySub, setMySub] = useState<MySubscription | null>(null);

    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const userBtnRef = useRef<HTMLButtonElement | null>(null);
    const userMenuRef = useRef<HTMLDivElement | null>(null);

    // ✅ Close dropdowns on outside click/tap (works for mouse + mobile)
    useEffect(() => {
        const onDoc = (e: PointerEvent) => {
            const t = e.target as Node;

            // mobile menu close
            if (open) {
                if (btnRef.current?.contains(t)) return;
                if (menuRef.current?.contains(t)) return;
                setOpen(false);
            }

            // desktop user menu close
            if (userOpen) {
                if (userBtnRef.current?.contains(t)) return;
                if (userMenuRef.current?.contains(t)) return;
                setUserOpen(false);
            }
        };

        document.addEventListener("pointerdown", onDoc);
        return () => document.removeEventListener("pointerdown", onDoc);
    }, [open, userOpen]);

    // ✅ Close menus on ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                setUserOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const initials =
        user?.name
            ?.split(" ")
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
            .toUpperCase() || "U";

    const isAdmin = useMemo(() => {
        const email = (user?.email || "").toLowerCase().trim();
        return !!ADMIN_EMAIL && email === ADMIN_EMAIL;
    }, [user?.email]);

    const closeAll = () => {
        setOpen(false);
        setUserOpen(false);
    };

    // ✅ pull cart from server (single place)
    async function refreshCartCount() {
        if (!user) {
            setLiveCartCount(0);
            return;
        }
        try {
            const items = await getCart();
            const count = items.reduce((sum, it) => sum + (it.qty || 0), 0);
            setLiveCartCount(count);
        } catch {
            // ignore (session expired etc)
        }
    }

    // ✅ load subscription (single place)
    async function loadMySubscription() {
        if (!user) {
            setMySub(null);
            return;
        }
        try {
            const s = await api<MySubscription>(`/api/subscriptions/stripe/me`);
            setMySub(s || null);
        } catch {
            setMySub(null);
        }
    }

    // ✅ when user changes, sync once
    useEffect(() => {
        setLiveCartCount(cartCount); // keep prop as initial fallback
        refreshCartCount();
        loadMySubscription();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ✅ listen for cart updates globally
    useEffect(() => {
        if (!user) return;

        const onCart = () => refreshCartCount();
        window.addEventListener(CART_EVENT, onCart);

        // fallback refresh when returning to tab
        const onVis = () => {
            if (document.visibilityState === "visible") {
                refreshCartCount();
                loadMySubscription();
            }
        };
        document.addEventListener("visibilitychange", onVis);

        return () => {
            window.removeEventListener(CART_EVENT, onCart);
            document.removeEventListener("visibilitychange", onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // ✅ tier + active-like gate (IMPORTANT kasi default tier = deluxe sa model)
    const activeLike = isActiveLikeStatus(mySub?.status);
    const tier = (activeLike ? mySub?.tier : null) as PlanKey | null;

    // ✅ match your desired accents:
    // Deluxe = blue, Grand = gold/amber, Royalty = red (palitan mo if needed)
    const profileAccentGlow =
        tier === "grand"
            ? "bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.22),transparent_60%)]" // red
            : tier === "royalty"
                ? "bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.22),transparent_60%)]" // gold
                : tier === "deluxe"
                    ? "bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.20),transparent_60%)]" // blue
                    : "";


    return (
        <div className="sticky top-0 z-50">
            {/* glass bar */}
            <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-4">
                <div
                    className="
            rounded-3xl
            border border-[color:var(--border)]
            bg-[color:var(--panel-bg)]
            backdrop-blur-sm
            shadow-[var(--shadow)]
            px-4 sm:px-5 py-3
            flex items-center justify-between
          "
                >
                    {/* left: brand */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)]">
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

                        <div className="leading-tight">
                            <p className="text-[10px] tracking-[0.35em] text-[color:var(--muted)]">
                                OPTIMAL CLOTHING
                            </p>
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Studio
                            </p>
                        </div>
                    </Link>

                    {/* right: desktop actions */}
                    <div className="hidden sm:flex items-center gap-2">
                        <Link
                            href="/cart"
                            className="
                relative inline-flex h-10 w-10 items-center justify-center
                rounded-full border border-[color:var(--border)]
                bg-[color:var(--soft-bg)]
                text-[color:var(--foreground)]
                hover:opacity-90 transition
              "
                            aria-label="Cart"
                            title="Cart"
                        >
                            <ShoppingCart size={18} />

                            {/* ✅ premium badge: only show when > 0 */}
                            {liveCartCount > 0 && (
                                <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] px-1 place-items-center rounded-full bg-red-500 text-[10px] text-white">
                                    {liveCartCount > 99 ? "99+" : liveCartCount}
                                </span>
                            )}
                        </Link>

                        <ThemeToggle />

                        {/* ✅ user dropdown trigger (desktop) */}
                        <div className="relative">
                            <button
                                ref={userBtnRef}
                                type="button"
                                onClick={() => setUserOpen((p) => !p)}
                                className="
                  ml-1 inline-flex items-center gap-3
                  rounded-full border border-[color:var(--border)]
                  bg-[color:var(--soft-bg)]
                  px-3 py-2
                  hover:opacity-90 transition
                "
                                aria-label="Account menu"
                                aria-expanded={userOpen}
                            >
                                {/* ✅ tier accent glow (no style change; just overlay) */}
                                {profileAccentGlow ? (
                                    <div
                                        className={clsx(
                                            "pointer-events-none absolute inset-0 -z-10 rounded-full opacity-80",
                                            profileAccentGlow
                                        )}
                                    />
                                ) : null}

                                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center text-xs font-semibold">
                                    {user?.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={user.avatar}
                                            alt={user.name || "User"}
                                            className="h-full w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <span className="text-[color:var(--foreground)]">
                                            {initials}
                                        </span>
                                    )}
                                </div>

                                <div className="hidden md:block text-left">
                                    <p className="text-xs font-medium text-[color:var(--foreground)] leading-none">
                                        {user?.name || "Account"}
                                    </p>
                                    <p className="text-[11px] text-[color:var(--muted)] mt-1 leading-none">
                                        {user?.email || "Signed in"}
                                    </p>
                                </div>

                                <ChevronDown size={16} className="opacity-70" />
                            </button>

                            {userOpen && (
                                <div
                                    ref={userMenuRef}
                                    className="
                    absolute right-0 mt-3 w-[260px]
                    rounded-3xl
                    border border-[color:var(--border)]
                    bg-[color:var(--panel-bg)]
                    backdrop-blur-md
                    shadow-[var(--shadow)]
                    p-2
                  "
                                >
                                    <Link
                                        href="/app/profile"
                                        onClick={closeAll}
                                        className="
                      flex items-center gap-3
                      rounded-2xl px-4 py-3
                      bg-[color:var(--soft-bg)]
                      border border-[color:var(--border)]
                      hover:opacity-90 transition
                    "
                                    >
                                        <UserIcon size={18} />
                                        <span className="text-sm">Profile</span>
                                    </Link>

                                    {isAdmin && (
                                        <Link
                                            href="/app/admin"
                                            onClick={closeAll}
                                            className="
                        mt-2 flex items-center gap-3
                        rounded-2xl px-4 py-3
                        bg-[color:var(--soft-bg)]
                        border border-[color:var(--border)]
                        hover:opacity-90 transition
                      "
                                        >
                                            <Shield size={18} />
                                            <span className="text-sm">Admin Dashboard</span>
                                        </Link>
                                    )}

                                    {onLogout && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeAll();
                                                onLogout();
                                            }}
                                            className="
                        mt-2 w-full
                        flex items-center gap-3
                        rounded-2xl px-4 py-3
                        bg-[color:var(--soft-bg)]
                        border border-[color:var(--border)]
                        text-left
                        hover:opacity-90 transition
                      "
                                        >
                                            <LogOut size={18} />
                                            <span className="text-sm">Logout</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* mobile menu */}
                    <div className="sm:hidden flex items-center gap-2">
                        <ThemeToggle />

                        <button
                            ref={btnRef}
                            onClick={() => setOpen((p) => !p)}
                            className="
                inline-flex h-10 w-10 items-center justify-center
                rounded-full border border-[color:var(--border)]
                bg-[color:var(--soft-bg)]
                text-[color:var(--foreground)]
                hover:opacity-90 transition
              "
                            aria-label="Menu"
                            title="Menu"
                            aria-expanded={open}
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                {/* mobile dropdown */}
                {open && (
                    <div
                        ref={menuRef}
                        className="
              mt-3 rounded-3xl
              border border-[color:var(--border)]
              bg-[color:var(--panel-bg)]
              backdrop-blur-2sm
              shadow-[var(--shadow)]
              p-3
            "
                    >
                        <Link
                            href="/cart"
                            onClick={closeAll}
                            className="
                flex items-center justify-between
                rounded-2xl px-4 py-3
                bg-[color:var(--soft-bg)]
                border border-[color:var(--border)]
                hover:opacity-90 transition
              "
                        >
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={18} />
                                <span className="text-sm">Cart</span>
                            </div>

                            {/* ✅ premium: show 0 cleanly */}
                            <span className="text-xs text-[color:var(--muted)]">
                                {liveCartCount > 99 ? "99+" : liveCartCount}
                            </span>
                        </Link>

                        <Link
                            href="/app/profile"
                            onClick={closeAll}
                            className="
                mt-2 flex items-center gap-3
                rounded-2xl px-4 py-3
                bg-[color:var(--soft-bg)]
                border border-[color:var(--border)]
                hover:opacity-90 transition
              "
                        >
                            <UserIcon size={18} />
                            <span className="text-sm">Profile</span>
                        </Link>

                        {isAdmin && (
                            <Link
                                href="/app/admin"
                                onClick={closeAll}
                                className="
                  mt-2 flex items-center gap-3
                  rounded-2xl px-4 py-3
                  bg-[color:var(--soft-bg)]
                  border border-[color:var(--border)]
                  hover:opacity-90 transition
                "
                            >
                                <Shield size={18} />
                                <span className="text-sm">Admin Dashboard</span>
                            </Link>
                        )}

                        {onLogout && (
                            <button
                                type="button"
                                onClick={() => {
                                    closeAll();
                                    onLogout();
                                }}
                                className="
                  mt-2 w-full
                  flex items-center gap-3
                  rounded-2xl px-4 py-3
                  bg-[color:var(--soft-bg)]
                  border border-[color:var(--border)]
                  text-left
                  hover:opacity-90 transition
                "
                            >
                                <LogOut size={18} />
                                <span className="text-sm">Logout</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
