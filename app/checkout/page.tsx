"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { createOrder } from "@/services/orders";

import { CartItem, cartSubtotal, clearCart, getCart } from "@/services/cart";

function formatMoney(n: number) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

export default function CheckoutPage() {
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    const [items, setItems] = useState<CartItem[]>([]);
    const [loadingCart, setLoadingCart] = useState(true);
    const [placing, setPlacing] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        notes: "",
        payment: "cod", // cod | gcash | card (placeholder)
    });

    // 🔐 protect route
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/checkout");
    }, [loading, user, router]);

    // 🛒 load cart
    useEffect(() => {
        if (!user) return;

        (async () => {
            try {
                setLoadingCart(true);
                const serverItems = await getCart();
                setItems(serverItems);

                setForm((p) => ({
                    ...p,
                    email: p.email || user.email || "",
                    fullName: p.fullName || user.name || "",
                }));
            } catch (e: any) {
                toast.error(e?.message || "Failed to load cart");
            } finally {
                setLoadingCart(false);
            }
        })();
    }, [user]);

    const subtotal = useMemo(() => cartSubtotal(items), [items]);
    const shipping = subtotal > 0 ? 120 : 0; // placeholder
    const total = subtotal + shipping;

    const canSubmit =
        items.length > 0 &&
        form.fullName.trim().length >= 2 &&
        form.email.includes("@") &&
        form.phone.trim().length >= 7 &&
        form.address.trim().length >= 6 &&
        form.city.trim().length >= 2 &&
        !placing;

    async function placeOrder() {
        if (!canSubmit) return;

        const t = toast.loading("Placing order...");
        setPlacing(true);

        try {
            const payload = {
                customerName: form.fullName.trim(),
                customerEmail: form.email.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                notes: form.notes.trim(),
                paymentMethod: form.payment,

                items: items.map((it) => ({
                    productId: it.id,
                    productName: it.name,
                    variantId: it.variant || "",
                    variantName: it.variantName || "Standard",
                    qty: it.qty,
                    unitPrice: it.price,
                    image: it.image || "",
                })),

                shippingFee: shipping,
                subtotal,
                total,
                status: "pending",
            };

            await createOrder(payload);

            await clearCart(); // emits cart update
            setItems([]);

            toast.success("Order placed ✅", { id: t });
            router.replace("/orders");
        } catch (e: any) {
            toast.error(e?.message || "Failed to place order", { id: t });
        } finally {
            setPlacing(false);
        }
    }

    if (loading) return null;
    if (!user) return null;

    return (
        <div className="min-h-screen">
            <AppTopBar
                user={user}
                cartCount={items.reduce((s, i) => s + i.qty, 0)}
                onLogout={async () => {
                    await logout();
                    router.replace("/");
                }}
            />

            {/* background */}
            <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(55%_45%_at_50%_15%,rgba(239,68,68,0.12),transparent_60%)]" />
            <div
                className="pointer-events-none fixed inset-0 -z-20 opacity-[0.06]
        [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)]
        [background-size:84px_84px]"
            />

            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
                <div className="flex items-center justify-between gap-3">
                    <Link
                        href="/cart"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
              border border-[color:var(--btn-secondary-border)]
              bg-[color:var(--btn-secondary-bg)]
              text-[color:var(--btn-secondary-fg)]
              hover:opacity-90 transition"
                    >
                        <ArrowLeft size={16} /> Back to cart
                    </Link>

                    <div className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)]">
                        <Lock size={14} />
                        Secure checkout
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    {/* form */}
                    <div
                        className="rounded-[28px] border border-[color:var(--border)]
              bg-[color:var(--panel-bg)] backdrop-blur-2sm shadow-[var(--shadow)]
              p-5 sm:p-6"
                    >
                        <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>
                        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Checkout</h1>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">
                            Enter shipping details. Payment options are placeholders for now.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <Field
                                label="Full name"
                                value={form.fullName}
                                onChange={(v) => setForm((p) => ({ ...p, fullName: v }))}
                            />
                            <Field
                                label="Email"
                                value={form.email}
                                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                            />
                            <Field
                                label="Phone"
                                value={form.phone}
                                onChange={(v) => setForm((p) => ({ ...p, phone: v }))}
                            />
                            <Field
                                label="City"
                                value={form.city}
                                onChange={(v) => setForm((p) => ({ ...p, city: v }))}
                            />

                            <div className="sm:col-span-2">
                                <Field
                                    label="Address"
                                    value={form.address}
                                    onChange={(v) => setForm((p) => ({ ...p, address: v }))}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs text-[color:var(--muted)]">Notes (optional)</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                    className="mt-2 w-full min-h-[90px] rounded-2xl px-4 py-3 text-sm
                    border border-[color:var(--border)] bg-[color:var(--soft-bg)]
                    text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-red-500/30"
                                    placeholder="Gate code, landmark, delivery time..."
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">Payment</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                {[
                                    { key: "cod", label: "Cash on delivery" },
                                    { key: "gcash", label: "GCash (soon)" },
                                    { key: "card", label: "Card (soon)" },
                                ].map((p) => (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => setForm((x) => ({ ...x, payment: p.key }))}
                                        className={`
                      rounded-2xl px-4 py-3 text-sm text-left
                      border border-[color:var(--border)] transition hover:opacity-90
                      ${form.payment === p.key ? "bg-[color:var(--card-bg)]" : "bg-[color:var(--soft-bg)]"}
                    `}
                                    >
                                        <p className="font-medium text-[color:var(--foreground)]">{p.label}</p>
                                        <p className="mt-1 text-[11px] text-[color:var(--muted)]">Placeholder</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={placeOrder}
                            disabled={!canSubmit}
                            className={`
                mt-7 w-full rounded-2xl px-4 py-3 text-sm font-medium
                bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]
                hover:opacity-90 transition
                ${!canSubmit ? "opacity-50 pointer-events-none" : ""}
              `}
                        >
                            {placing ? "Placing order..." : "Place order"}
                        </button>

                        {!canSubmit && items.length > 0 && (
                            <p className="mt-3 text-[11px] text-[color:var(--muted)]">Fill out required fields to continue.</p>
                        )}

                        {!loadingCart && items.length === 0 && (
                            <p className="mt-3 text-[11px] text-[color:var(--muted)]">
                                Your cart is empty — go back and add items.
                            </p>
                        )}
                    </div>

                    {/* summary */}
                    <div className="space-y-4">
                        <div
                            className="rounded-[28px] border border-[color:var(--border)]
                bg-[color:var(--panel-bg)] backdrop-blur-2sm shadow-[var(--shadow)] p-5"
                        >
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">Order Summary</p>

                            <div className="mt-4 space-y-3">
                                {loadingCart ? (
                                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4 text-sm text-[color:var(--muted)]">
                                        Loading items…
                                    </div>
                                ) : items.length === 0 ? (
                                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4 text-sm text-[color:var(--muted)]">
                                        No items yet.
                                    </div>
                                ) : (
                                    items.map((it) => (
                                        <div
                                            key={`${it.id}-${it.variant ?? ""}`}
                                            className="flex items-start justify-between gap-3 rounded-2xl
                        border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[color:var(--foreground)] truncate">{it.name}</p>
                                                <p className="mt-1 text-[11px] text-[color:var(--muted)] truncate">
                                                    {it.variantName ? `${it.variantName} · ` : ""}
                                                    {it.qty} × {formatMoney(it.price)}
                                                </p>
                                            </div>
                                            <p className="text-sm font-semibold text-[color:var(--foreground)] whitespace-nowrap">
                                                {formatMoney(it.price * it.qty)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-5 space-y-2 text-sm">
                                <div className="flex justify-between text-[color:var(--muted)]">
                                    <span>Subtotal</span>
                                    <span className="text-[color:var(--foreground)]">{formatMoney(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-[color:var(--muted)]">
                                    <span>Shipping</span>
                                    <span className="text-[color:var(--foreground)]">{formatMoney(shipping)}</span>
                                </div>
                                <div className="mt-3 h-px w-full bg-[color:var(--border)]" />
                                <div className="flex justify-between">
                                    <span className="text-sm font-semibold text-[color:var(--foreground)]">Total</span>
                                    <span className="text-sm font-semibold text-[color:var(--foreground)]">{formatMoney(total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card-bg)] p-5">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">Print assurance</p>
                            <p className="mt-2 text-xs text-[color:var(--muted)]">
                                Your preview placement is respected. We’ll add a final print-safe check before production.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <label className="text-xs text-[color:var(--muted)]">{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm
          border border-[color:var(--border)] bg-[color:var(--soft-bg)]
          text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-red-500/30"
                placeholder={label}
            />
        </div>
    );
}
