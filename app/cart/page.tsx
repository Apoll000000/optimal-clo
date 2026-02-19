"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { useRouter } from "next/navigation";

import { CartItem, cartSubtotal, getCart, removeItem, updateQty } from "@/services/cart";

function formatMoney(n: number) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

export default function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loadingCart, setLoadingCart] = useState(true);

    const { user, loading, logout } = useAuth();
    const router = useRouter();

    // protect route
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/cart");
    }, [loading, user, router]);

    // load cart from backend
    useEffect(() => {
        if (!user) return;

        (async () => {
            try {
                setLoadingCart(true);
                const serverItems = await getCart();
                setItems(serverItems);
            } catch (e: any) {
                toast.error(e?.message || "Failed to load cart");
            } finally {
                setLoadingCart(false);
            }
        })();
    }, [user]);

    const subtotal = useMemo(() => cartSubtotal(items), [items]);
    const shipping = subtotal > 0 ? 120 : 0;
    const total = subtotal + shipping;

    const onDec = async (it: CartItem) => {
        const nextQty = Math.max(1, it.qty - 1);
        try {
            const next = await updateQty(it.id, it.variant, nextQty);
            setItems(next);
        } catch (e: any) {
            toast.error(e?.message || "Failed to update quantity");
        }
    };

    const onInc = async (it: CartItem) => {
        const nextQty = Math.min(99, it.qty + 1);
        try {
            const next = await updateQty(it.id, it.variant, nextQty);
            setItems(next);
        } catch (e: any) {
            toast.error(e?.message || "Failed to update quantity");
        }
    };

    const onRemove = async (it: CartItem) => {
        try {
            const next = await removeItem(it.id, it.variant);
            setItems(next);
            toast.success("Removed from cart");
        } catch (e: any) {
            toast.error(e?.message || "Failed to remove item");
        }
    };

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
                {/* header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>
                        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)]">Your Cart</h1>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">
                            Review your pieces before checkout. Clean fit. Clean print.
                        </p>
                    </div>

                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium
              border border-[color:var(--btn-secondary-border)]
              bg-[color:var(--btn-secondary-bg)]
              text-[color:var(--btn-secondary-fg)]
              hover:opacity-90 transition"
                    >
                        Continue shopping <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                    {/* LEFT */}
                    <div
                        className="rounded-[28px] border border-[color:var(--border)]
              bg-[color:var(--panel-bg)] backdrop-blur-2sm shadow-[var(--shadow)]
              p-4 sm:p-6"
                    >
                        {loadingCart ? (
                            <div className="py-20 text-center text-sm text-[color:var(--muted)]">Loading cart…</div>
                        ) : items.length === 0 ? (
                            <div className="py-14 text-center">
                                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Cart is empty</h2>
                                <p className="mt-2 text-sm text-[color:var(--muted)]">Start with a drop, or customize your own design.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {items.map((it) => (
                                    <div
                                        key={`${it.id}-${it.variant ?? ""}`}
                                        className="rounded-3xl border border-[color:var(--border)]
                      bg-[color:var(--card-bg)] p-3 sm:p-4 flex gap-4"
                                    >
                                        {/* image */}
                                        <div
                                            className="relative h-20 w-20 sm:h-24 sm:w-24 flex-none overflow-hidden rounded-2xl
                        border border-[color:var(--border)] bg-[color:var(--soft-bg)]"
                                        >
                                            {it.image ? (
                                                <Image src={it.image} alt={it.name} fill className="object-cover" />
                                            ) : (
                                                <div className="h-full w-full grid place-items-center text-xs text-[color:var(--muted)]">image</div>
                                            )}
                                        </div>

                                        {/* info */}
                                        <div className="min-w-0 flex-1">
                                            {/* ✅ mobile: stack; desktop: row */}
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm sm:text-base font-semibold text-[color:var(--foreground)] truncate">
                                                        {it.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{it.subtitle}</p>
                                                </div>

                                                {/* ✅ FIX: never shrink/cut */}
                                                <p className="text-sm font-semibold text-[color:var(--foreground)] shrink-0 whitespace-nowrap sm:text-right">
                                                    {formatMoney(it.price * it.qty)}
                                                </p>
                                            </div>

                                            {/* ✅ mobile: stack qty + remove */}
                                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                                <div
                                                    className="inline-flex items-center rounded-full border
                            border-[color:var(--border)] bg-[color:var(--soft-bg)]
                            px-2 py-1 w-fit"
                                                >
                                                    <button onClick={() => onDec(it)} className="h-9 w-9 grid place-items-center rounded-full hover:opacity-90 transition">
                                                        <Minus size={16} />
                                                    </button>
                                                    <div className="min-w-[34px] text-center text-sm font-medium text-[color:var(--foreground)]">
                                                        {it.qty}
                                                    </div>
                                                    <button onClick={() => onInc(it)} className="h-9 w-9 grid place-items-center rounded-full hover:opacity-90 transition">
                                                        <Plus size={16} />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => onRemove(it)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm
                            border border-[color:var(--border)]
                            bg-[color:var(--soft-bg)] hover:opacity-90 transition
                            w-full sm:w-auto"
                                                >
                                                    <Trash2 size={16} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT */}
                    <div
                        className="rounded-[28px] border border-[color:var(--border)]
              bg-[color:var(--panel-bg)] backdrop-blur-2sm shadow-[var(--shadow)]
              p-5 h-fit"
                    >
                        <p className="text-sm font-semibold text-[color:var(--foreground)]">Order Summary</p>

                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span className="whitespace-nowrap">{formatMoney(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span className="whitespace-nowrap">{formatMoney(shipping)}</span>
                            </div>
                            <div className="mt-3 h-px bg-[color:var(--border)]" />
                            <div className="flex justify-between font-semibold">
                                <span>Total</span>
                                <span className="whitespace-nowrap">{formatMoney(total)}</span>
                            </div>
                        </div>

                        <Link
                            href="/checkout"
                            className={`mt-5 w-full inline-flex items-center justify-center gap-2
                rounded-2xl px-4 py-3 text-sm font-medium
                bg-[color:var(--btn-primary-bg)]
                text-[color:var(--btn-primary-fg)]
                hover:opacity-90 transition
                ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`}
                        >
                            Proceed to Checkout <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
