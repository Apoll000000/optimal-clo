"use client";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { getCart } from "@/services/cart";
import { getOrderById, updateOrder, Order } from "@/services/orders";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    ArrowLeft,
    BadgeInfo,
    ClipboardList,
    Image as ImageIcon,
    ShoppingBag,
    X,
} from "lucide-react";

function money(n: number) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

const CART_EVENT = "optimal:cart-updated";

function statusPillClass(status: string) {
    if (status === "pending") return "border-yellow-500/30 bg-yellow-500/10 text-[color:var(--foreground)]";
    if (status === "approved") return "border-blue-500/30 bg-blue-500/10 text-[color:var(--foreground)]";
    if (status === "paid") return "border-sky-500/30 bg-sky-500/10 text-[color:var(--foreground)]";
    if (status === "shipped") return "border-purple-500/30 bg-purple-500/10 text-[color:var(--foreground)]";
    if (status === "delivered") return "border-green-500/30 bg-green-500/10 text-[color:var(--foreground)]";
    if (status === "cancelled") return "border-red-500/30 bg-red-500/10 text-[color:var(--foreground)]";
    return "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]";
}

function canCancel(status: Order["status"]) {
    return status !== "shipped" && status !== "delivered" && status !== "cancelled";
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span
            className="inline-flex items-center rounded-full border border-[color:var(--border)]
      bg-[color:var(--soft-bg)] px-3 py-1 text-[11px] text-[color:var(--muted)]"
        >
            {children}
        </span>
    );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            className={clsx(
                "w-full rounded-2xl px-4 py-3 text-sm min-h-[96px] resize-none",
                "border border-[color:var(--border)] bg-[color:var(--soft-bg)]",
                "text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]",
                "outline-none focus:ring-2 focus:ring-red-500/30",
                props.className
            )}
        />
    );
}

function SmallButton({
    children,
    onClick,
    variant = "soft",
    disabled,
    type = "button",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "soft" | "primary" | "danger" | "ghost";
    disabled?: boolean;
    type?: "button" | "submit";
}) {
    const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition";
    const soft =
        "border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90";
    const primary = "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90";
    const danger = "border border-red-500/30 bg-red-500/10 text-[color:var(--foreground)] hover:opacity-90";
    const ghost = "text-[color:var(--foreground)] hover:bg-[color:var(--soft-bg)]";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                base,
                variant === "primary" ? primary : variant === "danger" ? danger : variant === "ghost" ? ghost : soft,
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            {children}
        </button>
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

function CancelModal({
    open,
    onClose,
    onConfirm,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    loading: boolean;
}) {
    const [reason, setReason] = useState("");

    useEffect(() => {
        if (open) setReason("");
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[90]"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !loading) onClose();
            }}
        >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            <div className="relative mx-auto h-full w-full max-w-lg px-4 sm:px-6 py-10">
                <div
                    className="rounded-[28px] border border-[color:var(--border)]
          bg-[color:var(--panel-bg)] shadow-[var(--shadow)] overflow-hidden"
                >
                    <div className="px-5 sm:px-6 py-4 border-b border-[color:var(--border)] flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>
                            <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">Cancel this order?</h3>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                                Once cancelled, your order status will change to <b>cancelled</b>.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                if (loading) return;
                                onClose();
                            }}
                            className="rounded-2xl p-2 border border-[color:var(--border)] bg-[color:var(--soft-bg)] hover:opacity-90 transition"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-5 sm:px-6 py-5 space-y-4">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">Are you sure?</p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                                If your order is already shipped, cancellation is not allowed.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Reason (optional)
                            </p>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Wrong address, changed mind, etc."
                            />
                            <p className="text-[11px] text-[color:var(--muted)]">
                                We’ll save this in notes.
                            </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            <SmallButton
                                variant="soft"
                                onClick={() => {
                                    if (loading) return;
                                    onClose();
                                }}
                                disabled={loading}
                            >
                                Keep order
                            </SmallButton>

                            <SmallButton
                                variant="danger"
                                onClick={() => onConfirm(reason)}
                                disabled={loading}
                            >
                                {loading ? "Cancelling..." : "Yes, cancel order"}
                            </SmallButton>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrderDetailsPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [cartCount, setCartCount] = useState(0);
    const [order, setOrder] = useState<Order | null>(null);
    const [loadingOrder, setLoadingOrder] = useState(true);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // protect
    useEffect(() => {
        if (!loading && !user) router.replace(`/login?next=/orders/${id}`);
    }, [loading, user, router, id]);

    async function refreshCartCount() {
        try {
            const items = await getCart();
            setCartCount(items.reduce((s, it) => s + (it.qty || 0), 0));
        } catch {
            // ignore
        }
    }

    async function loadOrder() {
        if (!id) return;
        setLoadingOrder(true);
        try {
            const data = await getOrderById(id);
            setOrder(data);
        } catch (e: any) {
            toast.error(e?.message || "Failed to load order");
        } finally {
            setLoadingOrder(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        loadOrder();
        refreshCartCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, id]);

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
    }, [user]);

    const totals = useMemo(() => {
        const items = order?.items || [];
        const subtotal = items.reduce((s, it) => s + (it.unitPrice || 0) * (it.qty || 0), 0);
        return { subtotal };
    }, [order]);

    async function confirmCancel(reason: string) {
        if (!order) return;

        // frontend guard
        if (!canCancel(order.status)) {
            toast.error("This order can’t be cancelled anymore.");
            setCancelOpen(false);
            return;
        }

        const t = toast.loading("Cancelling order...");
        setCancelling(true);
        try {
            const nextNotes = reason.trim()
                ? `${order.notes ? `${order.notes}\n\n` : ""}[Cancel reason] ${reason.trim()}`
                : order.notes || "";

            const updated = await updateOrder(order.id, { status: "cancelled", notes: nextNotes });
            setOrder(updated);

            toast.success("Order cancelled ✅", { id: t });
            setCancelOpen(false);
        } catch (e: any) {
            toast.error(e?.message || "Failed to cancel order", { id: t });
        } finally {
            setCancelling(false);
        }
    }

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
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => router.push("/orders")}
                        className="rounded-full px-5 py-3 text-sm font-medium
              border border-[color:var(--border)] bg-[color:var(--card-bg)]
              text-[color:var(--foreground)] hover:opacity-90 transition inline-flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Back to orders
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
                </div>

                <div className="mt-6">
                    {loadingOrder ? (
                        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
                            <div className="h-72 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--soft-bg)]" />
                            <div className="h-72 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--soft-bg)]" />
                        </div>
                    ) : !order ? (
                        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-10 text-center">
                            <div className="mx-auto h-12 w-12 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center text-[color:var(--muted)]">
                                <ClipboardList size={20} />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">Order not found</p>
                            <p className="mt-2 text-sm text-[color:var(--muted)]">Try going back and refreshing.</p>
                            <button
                                onClick={() => router.push("/orders")}
                                className="mt-5 rounded-full px-6 py-3 text-sm font-medium
                  bg-[color:var(--btn-primary-bg)]
                  text-[color:var(--btn-primary-fg)]
                  hover:opacity-90 transition"
                            >
                                Back to orders
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
                            {/* LEFT: Items */}
                            <SectionCard>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">ORDER DETAILS</p>
                                        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">
                                            #{order.id.slice(-6).toUpperCase()}
                                        </h1>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Pill>Date: {order.createdAt}</Pill>
                                            <span className={clsx("rounded-full px-3 py-1 text-[11px] font-medium border", statusPillClass(order.status))}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canCancel(order.status) ? (
                                            <SmallButton variant="danger" onClick={() => setCancelOpen(true)}>
                                                Cancel order
                                            </SmallButton>
                                        ) : (
                                            <Pill>Cancellation closed</Pill>
                                        )}
                                    </div>
                                </div>

                                <div className="my-5 h-px w-full bg-[color:var(--border)]" />

                                <div className="space-y-3">
                                    {(order.items || []).map((it, idx) => (
                                        <div
                                            key={`${it.productId}-${idx}`}
                                            className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] flex-none grid place-items-center">
                                                    {it.image ? (
                                                        <Image src={it.image} alt={it.productName} fill className="object-cover" />
                                                    ) : (
                                                        <ImageIcon size={18} className="opacity-70" />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">
                                                        {it.productName || "Product"}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                                                        {it.variantName ? `Variant: ${it.variantName}` : "Base item"}
                                                    </p>

                                                    <div className="mt-3 flex items-center justify-between">
                                                        <p className="text-xs text-[color:var(--muted)]">
                                                            Qty: <span className="text-[color:var(--foreground)] font-medium">{it.qty}</span>
                                                        </p>
                                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                                            {money((it.unitPrice || 0) * (it.qty || 0))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {order.notes ? (
                                    <>
                                        <div className="my-5 h-px w-full bg-[color:var(--border)]" />
                                        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4">
                                            <div className="flex items-center gap-2 text-[color:var(--muted)]">
                                                <BadgeInfo size={16} />
                                                <p className="text-xs">Notes</p>
                                            </div>
                                            <p className="mt-2 text-sm text-[color:var(--foreground)] whitespace-pre-wrap">{order.notes}</p>
                                        </div>
                                    </>
                                ) : null}
                            </SectionCard>

                            {/* RIGHT: Summary */}
                            <SectionCard>
                                <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">SUMMARY</p>

                                <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-[color:var(--muted)]">Subtotal</p>
                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">{money(order.subtotal || totals.subtotal)}</p>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-[color:var(--muted)]">Shipping fee</p>
                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">{money(order.shippingFee || 0)}</p>
                                    </div>

                                    <div className="h-px w-full bg-[color:var(--border)]" />

                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-[color:var(--muted)]">Total</p>
                                        <p className="text-lg font-semibold text-[color:var(--foreground)]">{money(order.total || 0)}</p>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4">
                                    <p className="text-sm font-semibold text-[color:var(--foreground)]">Shipping info</p>
                                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                                        <span className="text-[color:var(--foreground)] font-medium">{order.customerName}</span>
                                        <br />
                                        {order.address}
                                        <br />
                                        {order.city}
                                    </p>

                                    <div className="mt-4 grid gap-2">
                                        <div>
                                            <p className="text-xs text-[color:var(--muted)]">Phone</p>
                                            <p className="text-sm text-[color:var(--foreground)]">{order.phone || "—"}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-[color:var(--muted)]">Email</p>
                                            <p className="text-sm text-[color:var(--foreground)]">{order.customerEmail || "—"}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-[color:var(--muted)]">Payment</p>
                                            <p className="text-sm text-[color:var(--foreground)]">{order.paymentMethod || "cod"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4">
                                    <p className="text-sm font-semibold text-[color:var(--foreground)]">Tracking</p>

                                    {/* These fields exist in backend schema now. If empty, show — */}
                                    <div className="mt-3 grid gap-2">
                                        <div>
                                            <p className="text-xs text-[color:var(--muted)]">Courier</p>
                                            <p className="text-sm text-[color:var(--foreground)]">{order.courier || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[color:var(--muted)]">Tracking #</p>
                                            <p className="text-sm text-[color:var(--foreground)]">{order.tracking || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                {canCancel(order.status) ? (
                                    <div className="mt-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">Cancellation available</p>
                                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                                            You can cancel this order until it becomes <b>shipped</b>.
                                        </p>
                                        <div className="mt-3">
                                            <SmallButton variant="danger" onClick={() => setCancelOpen(true)}>
                                                Cancel order
                                            </SmallButton>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4">
                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">Cancellation not available</p>
                                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                                            This order is already <b>{order.status}</b>.
                                        </p>
                                    </div>
                                )}
                            </SectionCard>
                        </div>
                    )}
                </div>
            </div>

            <CancelModal
                open={cancelOpen}
                loading={cancelling}
                onClose={() => setCancelOpen(false)}
                onConfirm={confirmCancel}
            />
        </div>
    );
}
