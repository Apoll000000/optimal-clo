"use client";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getMyOrders, Order } from "@/services/orders";
import { getCart } from "@/services/cart";
import {
    Package,
    ChevronRight,
    ClipboardList,
    RefreshCcw,
    ShoppingBag,
    Image as ImageIcon,
} from "lucide-react";

function money(n: number) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

const CART_EVENT = "optimal:cart-updated";

function firstItem(o: any) {
    const items = Array.isArray(o?.items) ? o.items : [];
    return items[0] || null;
}

function previewName(o: any) {
    const direct = String((o?.previewName || o?.designName || "")).trim();
    if (direct) return direct;

    const it = firstItem(o);
    if (!it) return "Order";

    const pn = String(it.productName || "").trim();
    const vn = String(it.variantName || "").trim();

    if (pn && vn && vn.toLowerCase() !== "standard") return `${pn} • ${vn}`;
    if (pn) return pn;
    return "Order";
}

function previewImage(o: any) {
    const it = firstItem(o);
    const img = String(it?.image || "").trim();
    return img || "";
}

function itemsLine(o: any) {
    const items = Array.isArray(o?.items) ? o.items : [];
    if (!items.length) return "0 item(s)";

    const it = items[0];
    const first = `${it?.qty ?? 1}× ${it?.productName ?? "Item"}${it?.variantName ? ` (${it.variantName})` : ""}`;
    if (items.length === 1) return first;
    return `${first} + ${items.length - 1} more`;
}

// ✅ Tab buckets
type TabKey = "active" | "completed" | "cancelled";

function isActiveStatus(s: Order["status"]) {
    return s !== "delivered" && s !== "cancelled"; // pending/approved/paid/shipped = active
}

function tabEmptyCopy(tab: TabKey) {
    if (tab === "active") return { title: "No active orders", desc: "Your pending/processing orders will appear here." };
    if (tab === "completed") return { title: "No completed orders", desc: "Delivered orders will appear here." };
    return { title: "No cancelled orders", desc: "Cancelled orders will appear here." };
}

function statusPillClass(status: Order["status"]) {
    if (status === "pending") return "border-yellow-500/30 bg-yellow-500/10 text-[color:var(--foreground)]";
    if (status === "approved") return "border-blue-500/30 bg-blue-500/10 text-[color:var(--foreground)]";
    if (status === "paid") return "border-sky-500/30 bg-sky-500/10 text-[color:var(--foreground)]";
    if (status === "shipped") return "border-purple-500/30 bg-purple-500/10 text-[color:var(--foreground)]";
    if (status === "delivered") return "border-green-500/30 bg-green-500/10 text-[color:var(--foreground)]";
    if (status === "cancelled") return "border-red-500/30 bg-red-500/10 text-[color:var(--foreground)]";
    return "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]";
}

function TabButton({
    active,
    label,
    count,
    onClick,
}: {
    active: boolean;
    label: string;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "rounded-full px-4 py-2 text-sm font-medium border transition inline-flex items-center gap-2",
                active
                    ? "border-transparent bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                    : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90"
            )}
            type="button"
        >
            <span>{label}</span>
            <span
                className={clsx(
                    "text-[11px] px-2 py-0.5 rounded-full border",
                    active
                        ? "border-transparent bg-black/15 text-[color:var(--btn-primary-fg)]"
                        : "border-[color:var(--border)] bg-[color:var(--card-bg)] text-[color:var(--muted)]"
                )}
            >
                {count}
            </span>
        </button>
    );
}

export default function OrdersPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);

    const [cartCount, setCartCount] = useState(0);

    const [tab, setTab] = useState<TabKey>("active");

    // protect
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/orders");
    }, [loading, user, router]);

    async function refreshCartCount() {
        try {
            const items = await getCart();
            setCartCount(items.reduce((s, it) => s + (it.qty || 0), 0));
        } catch {
            // ignore
        }
    }

    async function loadOrders() {
        if (!user?.email) return;

        setLoadingOrders(true);
        try {
            const data = await getMyOrders(user.email);
            setOrders(data);
        } catch (e: any) {
            toast.error(e?.message || "Failed to load orders");
        } finally {
            setLoadingOrders(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        loadOrders();
        refreshCartCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // live cart badge updates
    useEffect(() => {
        if (!user) return;
        const onCart = () => refreshCartCount();
        window.addEventListener(CART_EVENT, onCart);

        const onVis = () => {
            if (document.visibilityState === "visible") refreshCartCount();
        };
        document.addEventListener("visibilitychange", onVis);

        return () => {
            window.removeEventListener(CART_EVENT, onCart);
            document.removeEventListener("visibilitychange", onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const sorted = useMemo(() => {
        const copy = [...orders];
        copy.sort((a: any, b: any) => {
            const ad = new Date(a.createdAt).getTime();
            const bd = new Date(b.createdAt).getTime();
            if (!Number.isNaN(ad) && !Number.isNaN(bd)) return bd - ad;
            return 0;
        });
        return copy;
    }, [orders]);

    const buckets = useMemo(() => {
        const active = sorted.filter((o) => isActiveStatus(o.status));
        const completed = sorted.filter((o) => o.status === "delivered");
        const cancelled = sorted.filter((o) => o.status === "cancelled");
        return { active, completed, cancelled };
    }, [sorted]);

    const list = useMemo(() => buckets[tab], [buckets, tab]);

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

            {/* background */}
            <div
                className="pointer-events-none fixed inset-0 -z-10
        bg-[radial-gradient(55%_45%_at_50%_10%,rgba(239,68,68,0.14),transparent_60%)]"
            />
            <div
                className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06]
        [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)]
        [background-size:84px_84px]"
            />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-10">
                {/* header */}
                <div
                    className="rounded-[32px] border border-[color:var(--border)]
          bg-[color:var(--panel-bg)] backdrop-blur-2sm shadow-[var(--shadow)]
          p-6 sm:p-8"
                >
                    <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">YOUR ORDERS</p>

                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)]">Orders</h1>
                            <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl">
                                Track your purchases, statuses, and totals—everything stays synced to your account.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push("/products")}
                                className="rounded-full px-5 py-3 text-sm font-medium
                  border border-[color:var(--btn-secondary-border)]
                  bg-[color:var(--btn-secondary-bg)]
                  text-[color:var(--btn-secondary-fg)]
                  hover:opacity-90 transition inline-flex items-center gap-2"
                            >
                                <Package size={16} /> Products
                            </button>

                            <button
                                onClick={() => router.push("/cart")}
                                className="rounded-full px-5 py-3 text-sm font-medium
                  bg-[color:var(--btn-primary-bg)]
                  text-[color:var(--btn-primary-fg)]
                  hover:opacity-90 transition inline-flex items-center gap-2"
                            >
                                <ShoppingBag size={16} /> Cart
                            </button>

                            <button
                                onClick={loadOrders}
                                className="rounded-full px-5 py-3 text-sm font-medium
                  border border-[color:var(--border)]
                  bg-[color:var(--card-bg)]
                  text-[color:var(--foreground)]
                  hover:opacity-90 transition inline-flex items-center gap-2"
                                title="Refresh"
                            >
                                <RefreshCcw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* ✅ Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2">
                        <TabButton active={tab === "active"} label="Active" count={buckets.active.length} onClick={() => setTab("active")} />
                        <TabButton
                            active={tab === "completed"}
                            label="Completed"
                            count={buckets.completed.length}
                            onClick={() => setTab("completed")}
                        />
                        <TabButton
                            active={tab === "cancelled"}
                            label="Cancelled"
                            count={buckets.cancelled.length}
                            onClick={() => setTab("cancelled")}
                        />
                    </div>
                </div>

                {/* list */}
                <div className="mt-6">
                    {loadingOrders ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-52 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--soft-bg)]" />
                            ))}
                        </div>
                    ) : sorted.length === 0 ? (
                        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-10 text-center">
                            <div className="mx-auto h-12 w-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center text-[color:var(--muted)]">
                                <ClipboardList size={20} />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">No orders yet</p>
                            <p className="mt-2 text-sm text-[color:var(--muted)]">Once you checkout, your orders will appear here.</p>
                            <button
                                onClick={() => router.push("/products")}
                                className="mt-5 rounded-full px-6 py-3 text-sm font-medium
                  bg-[color:var(--btn-primary-bg)]
                  text-[color:var(--btn-primary-fg)]
                  hover:opacity-90 transition"
                            >
                                Browse products
                            </button>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-10 text-center">
                            <div className="mx-auto h-12 w-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center text-[color:var(--muted)]">
                                <ClipboardList size={20} />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">{tabEmptyCopy(tab).title}</p>
                            <p className="mt-2 text-sm text-[color:var(--muted)]">{tabEmptyCopy(tab).desc}</p>
                            <button
                                onClick={() => router.push("/products")}
                                className="mt-5 rounded-full px-6 py-3 text-sm font-medium
                  bg-[color:var(--btn-primary-bg)]
                  text-[color:var(--btn-primary-fg)]
                  hover:opacity-90 transition"
                            >
                                Browse products
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {list.map((o: any) => {
                                const img = previewImage(o);
                                const title = previewName(o);

                                return (
                                    <button
                                        key={o.id}
                                        onClick={() => router.push(`/orders/${o.id}`)}
                                        className="text-left rounded-[28px] border border-[color:var(--border)]
                      bg-[color:var(--card-bg)] shadow-[var(--shadow)]
                      p-5 hover:opacity-[0.985] transition"
                                    >
                                        {/* top row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">ORDER</p>
                                                <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)] truncate">
                                                    #{String(o.id).slice(-6).toUpperCase()}
                                                </p>
                                                <p className="mt-1 text-xs text-[color:var(--muted)]">
                                                    {o.createdAt} • {o.items?.length ?? 0} item(s)
                                                </p>
                                            </div>

                                            <span
                                                className={clsx(
                                                    "rounded-full px-3 py-1 text-[11px] font-medium border",
                                                    statusPillClass(o.status)
                                                )}
                                            >
                                                {o.status}
                                            </span>
                                        </div>

                                        {/* preview block */}
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] flex-none grid place-items-center">
                                                {img ? <Image src={img} alt={title} fill className="object-cover" /> : <ImageIcon size={18} className="opacity-70" />}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">{title}</p>
                                                <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{itemsLine(o)}</p>
                                            </div>
                                        </div>

                                        {/* total */}
                                        <div className="mt-5 flex items-end justify-between">
                                            <div>
                                                <p className="text-xs text-[color:var(--muted)]">Total</p>
                                                <p className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">{money(o.total)}</p>
                                            </div>

                                            <span className="inline-flex items-center gap-1 text-xs text-[color:var(--muted)]">
                                                View <ChevronRight size={16} className="opacity-70" />
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <footer className="mt-14 text-center text-xs text-[color:var(--muted-2)]">
                    © {new Date().getFullYear()} OPTIMAL CLOTHING — Studio
                </footer>
            </div>
        </div>
    );
}
