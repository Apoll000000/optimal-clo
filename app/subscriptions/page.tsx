"use client";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { getCart } from "@/services/cart";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    ArrowUpRight,
    BadgeCheck,
    Crown,
    Sparkles,
    ShieldCheck,
    Zap,
    Gem,
    Star,
    ShoppingBag,
    X,
    Clock3,
} from "lucide-react";

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

const CART_EVENT = "optimal:cart-updated";

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span
            className="inline-flex items-center rounded-full border border-[color:var(--border)]
      bg-[color:var(--soft-bg)] px-3 py-1 text-[11px] tracking-[0.22em] text-[color:var(--muted)]"
        >
            {children}
        </span>
    );
}

function SectionCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-[28px] border border-[color:var(--border)]
      bg-[color:var(--panel-bg)] backdrop-blur-2sm shadow-[var(--shadow)] p-5 sm:p-6"
        >
            {children}
        </div>
    );
}

function Toggle({
    left,
    right,
    value,
    onChange,
}: {
    left: string;
    right: string;
    value: "monthly" | "annual";
    onChange: (v: "monthly" | "annual") => void;
}) {
    return (
        <div
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)]
      bg-[color:var(--card-bg)] p-1 shadow-[var(--shadow)]"
            role="group"
            aria-label="Billing cycle"
        >
            <button
                type="button"
                onClick={() => onChange("monthly")}
                className={clsx(
                    "rounded-full px-4 py-2 text-xs font-medium transition",
                    value === "monthly"
                        ? "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                        : "text-[color:var(--muted)] hover:bg-[color:var(--soft-bg)]"
                )}
            >
                {left}
            </button>
            <button
                type="button"
                onClick={() => onChange("annual")}
                className={clsx(
                    "rounded-full px-4 py-2 text-xs font-medium transition",
                    value === "annual"
                        ? "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                        : "text-[color:var(--muted)] hover:bg-[color:var(--soft-bg)]"
                )}
            >
                {right}
            </button>
        </div>
    );
}

function Price({
    amount,
    suffix,
    note,
}: {
    amount: string;
    suffix: string;
    note?: string;
}) {
    return (
        <div className="mt-3">
            <div className="flex items-end gap-2">
                <span className="text-4xl sm:text-5xl font-semibold text-[color:var(--foreground)]">
                    {amount}
                </span>
                <span className="pb-1 text-xs text-[color:var(--muted)]">{suffix}</span>
            </div>
            {note ? <p className="mt-2 text-xs text-[color:var(--muted)]">{note}</p> : null}
        </div>
    );
}

function Feature({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2 text-sm text-[color:var(--foreground)]">
            <BadgeCheck size={16} className="mt-0.5 opacity-80" />
            <span className="text-sm text-[color:var(--muted)]">{children}</span>
        </li>
    );
}

function PlanCard({
    title,
    tagline,
    accent,
    badge,
    icon,
    priceMonthly,
    priceAnnual,
    value,
    popular,
    cta,
    onCta,
    perks,
    note,

    // ✅ clearer button states
    locked,
    isJoining,

    // ✅ subscription state UI
    isCurrent,
    currentCountdown,
    currentUntilText,
    cancelAtPeriodEnd,
    onCancel,
    cancelBusy,
}: {
    title: string;
    tagline: string;
    accent: "deluxe" | "grand" | "royalty";
    badge?: string;
    icon: React.ReactNode;
    priceMonthly: string;
    priceAnnual: string;
    value: "monthly" | "annual";
    popular?: boolean;
    cta: string;
    onCta: () => void;
    perks: string[];
    note?: string;

    locked?: boolean;
    isJoining?: boolean;

    isCurrent?: boolean;
    currentCountdown?: string;
    currentUntilText?: string;
    cancelAtPeriodEnd?: boolean;
    onCancel?: () => void;
    cancelBusy?: boolean;
}) {
    const amount = value === "annual" ? priceAnnual : priceMonthly;
    const suffix = value === "annual" ? "/ year" : "/ month";

    const accentRing =
        accent === "grand"
            ? "border-red-500/30"
            : accent === "royalty"
                ? "border-amber-500/30"
                : "border-[color:var(--border)]";

    const accentGlow =
        accent === "grand"
            ? "bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.22),transparent_60%)]"
            : accent === "royalty"
                ? "bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.18),transparent_60%)]"
                : "bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.18),transparent_60%)]";

    const ctaStyle =
        accent === "royalty"
            ? "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
            : accent === "grand"
                ? "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                : "border border-[color:var(--btn-secondary-border)] bg-[color:var(--btn-secondary-bg)] text-[color:var(--btn-secondary-fg)]";

    const currentBadge = isCurrent ? "CURRENT SUBSCRIPTION" : badge;

    // ✅ show panel if current; if no countdown yet, show syncing text
    const showPanel = Boolean(isCurrent);

    const joinDisabled = Boolean(locked || isJoining);

    return (
        <div
            className={clsx(
                "relative rounded-[28px] border bg-[color:var(--card-bg)] shadow-[var(--shadow)] overflow-hidden",
                accentRing,
                popular && "sm:-translate-y-2"
            )}
        >
            <div className={clsx("pointer-events-none absolute -inset-24 rotate-12 opacity-70", accentGlow)} />

            {currentBadge ? (
                <div className="absolute right-4 top-4 z-10">
                    <span
                        className={clsx(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium",
                            "border border-[color:var(--border)] bg-[color:var(--panel-bg)] text-[color:var(--foreground)]"
                        )}
                    >
                        <Sparkles size={14} className="opacity-80" />
                        {currentBadge}
                    </span>
                </div>
            ) : null}

            <div className="relative z-10 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-xs tracking-[0.35em] text-[color:var(--muted)] uppercase">{title}</p>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">{tagline}</p>
                    </div>

                    <div
                        className={clsx(
                            "h-11 w-11 rounded-2xl mt-7 border grid place-items-center",
                            "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                        )}
                    >
                        {icon}
                    </div>
                </div>

                <Price amount={amount} suffix={suffix} note={note} />

                {showPanel ? (
                    <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                                <Clock3 size={14} className="opacity-80" />
                                <span className="tracking-[0.18em] uppercase">Time remaining</span>
                            </div>
                            {cancelAtPeriodEnd ? (
                                <span className="text-[11px] px-2 py-1 rounded-full border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]">
                                    Cancel scheduled
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                            {currentCountdown || "Syncing renewal date…"}
                        </div>

                        <div className="mt-1 text-[11px] text-[color:var(--muted)]">
                            {currentUntilText
                                ? cancelAtPeriodEnd
                                    ? `You’re still subscribed until ${currentUntilText}.`
                                    : `Renews on ${currentUntilText}.`
                                : "We’ll update this after the latest Stripe sync."}
                        </div>
                    </div>
                ) : null}

                <div className="mt-5 h-px w-full bg-[color:var(--border)]" />

                <ul className="mt-5 space-y-3">
                    {perks.map((p) => (
                        <Feature key={p}>{p}</Feature>
                    ))}
                </ul>

                {isCurrent ? (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={cancelBusy || cancelAtPeriodEnd}
                        className={clsx(
                            "mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-90",
                            "border border-[color:var(--btn-secondary-border)] bg-[color:var(--btn-secondary-bg)] text-[color:var(--btn-secondary-fg)]",
                            (cancelBusy || cancelAtPeriodEnd) && "opacity-60 cursor-not-allowed"
                        )}
                    >
                        {cancelAtPeriodEnd
                            ? "Cancel scheduled"
                            : cancelBusy
                                ? "Cancelling…"
                                : "Cancel Plan"}{" "}
                        <X size={16} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onCta}
                        disabled={joinDisabled}
                        className={clsx(
                            "mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-90",
                            ctaStyle,
                            joinDisabled && "opacity-60 cursor-not-allowed"
                        )}
                    >
                        {isJoining ? "Redirecting..." : cta} <ArrowUpRight size={16} />
                    </button>
                )}

                {popular ? (
                    <p className="mt-3 text-center text-[11px] text-[color:var(--muted)]">
                        Most chosen tier — best value for regular drops.
                    </p>
                ) : null}
            </div>
        </div>
    );
}

type PlanKey = "deluxe" | "grand" | "royalty";

type DbPlan = {
    key: PlanKey;
    name: string;
    currency: "PHP";
    monthly: number;
    annual: number;
    autoAnnual?: boolean;
    annualDiscountPct?: number;
};

type MySubscription = {
    tier?: PlanKey;
    billingCycle?: "monthly" | "annual";
    status?: string;
    endsAt?: string | Date | null;
    cancelAtPeriodEnd?: boolean;
};

function peso(n: number) {
    const v = Math.round(Number(n || 0));
    return `₱${v.toLocaleString("en-PH")}`;
}

function toDate(x: any) {
    if (!x) return null;
    const d = x instanceof Date ? x : new Date(x);
    return isNaN(d.getTime()) ? null : d;
}

function fmtUntil(d: Date) {
    return d.toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function diffMDH(now: Date, end: Date) {
    let ms = end.getTime() - now.getTime();
    if (ms <= 0) return { months: 0, days: 0, hours: 0 };

    let months =
        (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());

    const anchor = new Date(now);
    anchor.setMonth(anchor.getMonth() + months);
    if (anchor.getTime() > end.getTime()) months = Math.max(0, months - 1);

    const afterMonths = new Date(now);
    afterMonths.setMonth(afterMonths.getMonth() + months);

    ms = end.getTime() - afterMonths.getTime();
    const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    const hours = Math.max(0, Math.floor((ms - days * 86400000) / (1000 * 60 * 60)));

    return { months, days, hours };
}

export default function SubscriptionsPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    const [cartCount, setCartCount] = useState(0);
    const [billing, setBilling] = useState<"monthly" | "annual">("annual");

    const [dbPlans, setDbPlans] = useState<DbPlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(false);

    const [joining, setJoining] = useState<PlanKey | null>(null);

    const [mySub, setMySub] = useState<MySubscription | null>(null);
    const [subLoading, setSubLoading] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);

    const [countdown, setCountdown] = useState<{ text: string; untilText: string } | null>(null);
    const tickRef = useRef<number | null>(null);

    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/subscriptions");
    }, [loading, user, router]);

    async function refreshCartCount() {
        try {
            const items = await getCart();
            setCartCount(items.reduce((s, it) => s + (it.qty || 0), 0));
        } catch { }
    }

    useEffect(() => {
        if (!user) return;
        refreshCartCount();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const onCart = () => refreshCartCount();
        window.addEventListener(CART_EVENT, onCart);
        return () => window.removeEventListener(CART_EVENT, onCart);
    }, [user]);

    async function loadPublicPlans() {
        setLoadingPlans(true);
        try {
            const data = await api<DbPlan[]>(`/api/subscriptions/public/plans`);
            setDbPlans(Array.isArray(data) ? data : []);
        } catch (e: any) {
            toast.error(e?.message || "Failed to load subscription pricing");
            setDbPlans([]);
        } finally {
            setLoadingPlans(false);
        }
    }

    async function loadMySubscription() {
        setSubLoading(true);
        try {
            const s = await api<MySubscription>(`/api/subscriptions/stripe/me`);
            setMySub(s || null);
        } catch {
            const uSub = (user as any)?.subscription as MySubscription | undefined;
            setMySub(uSub ? { ...uSub } : null);
        } finally {
            setSubLoading(false);
        }
    }

    useEffect(() => {
        loadPublicPlans();
        if (user) loadMySubscription();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    async function startCheckout(tier: PlanKey) {
        try {
            setJoining(tier);

            const payload = { tier, billingCycle: billing };

            const out = await api<{ url: string }>(`/api/subscriptions/stripe/checkout-session`, {
                method: "POST",
                body: JSON.stringify(payload),
            });

            if (!out?.url) throw new Error("No checkout URL returned");
            window.location.href = out.url;
        } catch (e: any) {
            toast.error(e?.message || "Failed to start checkout");
        } finally {
            setJoining(null);
        }
    }

    async function cancelPlan() {
        try {
            setCancelBusy(true);

            await api(`/api/subscriptions/stripe/cancel`, {
                method: "POST",
                body: JSON.stringify({ atPeriodEnd: true }),
            });

            toast.success("Cancellation scheduled", {
                description: "You’ll keep access until the end of your current billing period.",
            });

            await loadMySubscription();
        } catch (e: any) {
            toast.error(e?.message || "Failed to cancel subscription");
        } finally {
            setCancelBusy(false);
        }
    }

    const PLAN_META = useMemo(
        () => ({
            deluxe: {
                title: "Deluxe",
                tagline: "Entry access for clean drops + early previews.",
                accent: "deluxe" as const,
                icon: <Zap size={18} className="opacity-80" />,
                badge: undefined as string | undefined,
                popular: false,
                perks: [
                    "Limited access to Pro previews",
                    "Early drop notifications",
                    "Member-only weekly picks",
                    "Priority support (standard)",
                ],
                cta: "Join Deluxe",
            },
            grand: {
                title: "Grand",
                tagline: "Best balance of exclusives, perks, and value.",
                accent: "grand" as const,
                icon: <Gem size={18} className="opacity-80" />,
                badge: "BEST VALUE",
                popular: true,
                perks: [
                    "Exclusive limited-edition designs",
                    "Early access before public drops",
                    "Member perks & bundle pricing",
                    "Priority support (faster)",
                ],
                cta: "Join Grand",
            },
            royalty: {
                title: "Royalty",
                tagline: "VIP tier for maximum access + premium perks.",
                accent: "royalty" as const,
                icon: <Crown size={18} className="opacity-80" />,
                badge: "VIP",
                popular: false,
                perks: [
                    "All Grand benefits included",
                    "VIP-only limited releases",
                    "Priority access to collabs",
                    "Priority support (top queue)",
                ],
                cta: "Join Royalty",
            },
        }),
        []
    );

    const currentTier = (mySub?.tier || undefined) as PlanKey | undefined;
    const currentStatus = String(mySub?.status || "").toLowerCase();
    const isActiveLike =
        currentTier &&
        (currentStatus === "active" ||
            currentStatus === "trialing" ||
            currentStatus === "past_due" ||
            currentStatus === "unpaid" ||
            currentStatus === "incomplete");

    const cancelAtPeriodEnd = Boolean(mySub?.cancelAtPeriodEnd);
    const endsAt = useMemo(() => toDate(mySub?.endsAt), [mySub?.endsAt]);

    useEffect(() => {
        if (tickRef.current) {
            window.clearInterval(tickRef.current);
            tickRef.current = null;
        }

        if (!isActiveLike || !endsAt) {
            setCountdown(null);
            return;
        }

        const update = () => {
            const now = new Date();
            const untilText = fmtUntil(endsAt);
            const { months, days, hours } = diffMDH(now, endsAt);
            setCountdown({ text: `${months} mo • ${days} d • ${hours} h`, untilText });
        };

        update();
        tickRef.current = window.setInterval(update, 1000);

        return () => {
            if (tickRef.current) window.clearInterval(tickRef.current);
            tickRef.current = null;
        };
    }, [isActiveLike, endsAt]);

    const plans = useMemo(() => {
        const order: PlanKey[] = ["deluxe", "grand", "royalty"];
        return order.map((key) => {
            const meta = PLAN_META[key];
            const p = dbPlans.find((x) => x.key === key);

            const monthly = p?.monthly ?? 0;
            const annual = p?.annual ?? 0;
            const discountPct = Number(p?.annualDiscountPct ?? 0);

            const note =
                billing === "annual"
                    ? discountPct > 0
                        ? `Billed annually • ${discountPct}% discount applied`
                        : "Billed annually"
                    : "Billed monthly";

            const isCurrent = Boolean(isActiveLike && currentTier === key);
            const locked = Boolean(isActiveLike && currentTier && currentTier !== key);

            return {
                key,
                title: meta.title,
                tagline: meta.tagline,
                accent: meta.accent,
                icon: meta.icon,
                badge: meta.badge,
                popular: meta.popular,
                perks: meta.perks,
                cta: meta.cta,
                monthlyText: peso(monthly),
                annualText: peso(annual),
                note,
                isCurrent,
                locked,
            };
        });
    }, [PLAN_META, dbPlans, billing, isActiveLike, currentTier]);

    if (loading) return null;
    if (!user) return null;

    return (
        <div className="min-h-screen">
            <AppTopBar
                user={user}
                cartCount={cartCount}
                onLogout={async () => {
                    await logout();
                    router.replace("/");
                }}
            />

            <div
                className="pointer-events-none fixed inset-0 -z-10
        bg-[radial-gradient(55%_45%_at_50%_10%,rgba(239,68,68,0.14),transparent_60%)]"
            />
            <div
                className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06]
        [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)]
        [background-size:84px_84px]"
            />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-10 space-y-6">
                <SectionCard>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">SUBSCRIPTIONS</p>
                            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)]">
                                Optimal Pro Access
                            </h1>
                            <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl">
                                Choose your tier for limited editions, early drops, and member perks. Pricing is fetched from the database and managed in Admin.
                            </p>

                            {loadingPlans ? (
                                <p className="mt-2 text-xs text-[color:var(--muted)]">Loading latest pricing…</p>
                            ) : null}

                            {subLoading ? (
                                <p className="mt-2 text-xs text-[color:var(--muted)]">Checking your subscription…</p>
                            ) : null}

                            {!subLoading && isActiveLike && currentTier ? (
                                <p className="mt-2 text-xs text-[color:var(--muted)]">
                                    Active tier:{" "}
                                    <span className="text-[color:var(--foreground)] font-medium">
                                        {String(currentTier).toUpperCase()}
                                    </span>
                                    {countdown?.untilText ? (
                                        <>
                                            {" "}
                                            • {cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                                            <span className="text-[color:var(--foreground)] font-medium">
                                                {countdown.untilText}
                                            </span>
                                        </>
                                    ) : null}
                                </p>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                            <Pill>{billing === "annual" ? "Annual pricing" : "Monthly pricing"}</Pill>
                            <Toggle left="Monthly" right="Annual" value={billing} onChange={setBilling} />
                        </div>
                    </div>
                </SectionCard>

                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        { icon: <ShieldCheck size={18} />, t: "Secure checkout", d: "Stripe Sandbox is wired for testing." },
                        { icon: <Star size={18} />, t: "Premium drops", d: "Limited editions reserved for members." },
                        { icon: <ShoppingBag size={18} />, t: "Fits your flow", d: "Access perks while you browse & shop." },
                    ].map((x) => (
                        <div
                            key={x.t}
                            className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] shadow-[var(--shadow)] p-4"
                        >
                            <div className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center text-[color:var(--muted)]">
                                {x.icon}
                            </div>
                            <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">{x.t}</p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">{x.d}</p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {plans.map((p) => (
                        <PlanCard
                            key={p.key}
                            title={p.title}
                            tagline={p.tagline}
                            accent={p.accent}
                            badge={p.badge}
                            icon={p.icon}
                            priceMonthly={p.monthlyText}
                            priceAnnual={p.annualText}
                            value={billing}
                            popular={p.popular}
                            cta={p.cta}
                            perks={p.perks}
                            note={p.note}
                            locked={p.locked}
                            isJoining={joining === p.key}
                            onCta={() => {
                                if (p.locked) {
                                    toast.message("You’re already subscribed", {
                                        description: "Cancel your current plan (effective next billing cycle) before switching tiers.",
                                    });
                                    return;
                                }
                                startCheckout(p.key);
                            }}
                            isCurrent={p.isCurrent}
                            currentCountdown={p.isCurrent ? countdown?.text : undefined}
                            currentUntilText={p.isCurrent ? countdown?.untilText : undefined}
                            cancelAtPeriodEnd={p.isCurrent ? cancelAtPeriodEnd : undefined}
                            onCancel={p.isCurrent ? cancelPlan : undefined}
                            cancelBusy={p.isCurrent ? cancelBusy : undefined}
                        />
                    ))}
                </div>

                <SectionCard>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => router.push("/app")}
                            className="rounded-full px-5 py-2.5 text-sm font-medium
              border border-[color:var(--btn-secondary-border)]
              bg-[color:var(--btn-secondary-bg)]
              text-[color:var(--btn-secondary-fg)]
              hover:opacity-90 transition"
                        >
                            Back to App
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push("/products")}
                            className="rounded-full px-5 py-2.5 text-sm font-medium
              bg-[color:var(--btn-primary-bg)]
              text-[color:var(--btn-primary-fg)]
              hover:opacity-90 transition"
                        >
                            Browse products <ArrowUpRight size={16} className="inline ml-1" />
                        </button>
                    </div>
                </SectionCard>

                <footer className="mt-10 text-center text-xs text-[color:var(--muted-2)]">
                    © {new Date().getFullYear()} OPTIMAL CLOTHING — Studio
                </footer>
            </div>
        </div>
    );
}
