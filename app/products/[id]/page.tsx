"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { addItem } from "@/services/cart"; // ✅ server cart
import {
    ArrowLeft,
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    Package,
} from "lucide-react";

type Variant = {
    id: string;
    name: string;
    extraPrice: number;
    sku?: string;
    images: string[];
};

type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    stocks: number;
    status: "active" | "draft";
    coverImage?: string;
    variants: Variant[];
    createdAt: string;
};

function isoDate(d: any) {
    if (!d) return "—";
    try {
        return String(d).slice(0, 10);
    } catch {
        return "—";
    }
}

function normalizeProduct(p: any): Product {
    return {
        id: p._id ?? p.id,
        name: p.name ?? "",
        description: p.description ?? "",
        price: Number(p.price ?? 0),
        stocks: Number(p.stocks ?? 0),
        status: (p.status ?? "draft") as "active" | "draft",
        coverImage: p.coverImage ?? "",
        variants: (p.variants ?? []).map((v: any) => ({
            id: v.id ?? v._id ?? crypto.randomUUID(),
            name: v.name ?? "Variant",
            extraPrice: Number(v.extraPrice ?? 0),
            sku: v.sku ?? "",
            images: Array.isArray(v.images) ? v.images : [],
        })),
        createdAt: isoDate(p.createdAt),
    };
}

function money(n: number) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
    }).format(n);
}

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

function Skeleton() {
    return (
        <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="h-8 w-40 rounded-2xl bg-[color:var(--soft-bg)]" />
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="h-[420px] rounded-[28px] border border-[color:var(--border)] bg-[color:var(--soft-bg)]" />
                <div className="space-y-3">
                    <div className="h-10 w-3/4 rounded-2xl bg-[color:var(--soft-bg)]" />
                    <div className="h-5 w-2/3 rounded-2xl bg-[color:var(--soft-bg)]" />
                    <div className="h-24 w-full rounded-2xl bg-[color:var(--soft-bg)]" />
                    <div className="h-12 w-full rounded-2xl bg-[color:var(--soft-bg)]" />
                    <div className="h-12 w-full rounded-2xl bg-[color:var(--soft-bg)]" />
                    <div className="h-12 w-full rounded-2xl bg-[color:var(--soft-bg)]" />
                </div>
            </div>
        </div>
    );
}

export default function ProductDetailsPage() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const params = useParams<{ id: string }>();
    const id = params?.id;

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [errMsg, setErrMsg] = useState<string>("");

    // selection
    const [variantId, setVariantId] = useState<string>("");
    const [qty, setQty] = useState(1);

    // gallery
    const [activeImg, setActiveImg] = useState(0);

    async function load() {
        if (!id) return;
        setLoading(true);
        setErrMsg("");
        try {
            // ✅ backend must have: GET /api/products/:id
            const data = await api<any>(`/api/products/${encodeURIComponent(id)}`);
            const p = normalizeProduct(data);
            setProduct(p);

            const firstVariant = p.variants?.[0];
            setVariantId(firstVariant?.id || "");
            setQty(1);
            setActiveImg(0);

        } catch (e: any) {
            setErrMsg(e?.message || "Failed to load product");
            setProduct(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const selectedVariant = useMemo(() => {
        if (!product) return null;
        return (
            product.variants.find((v) => v.id === variantId) ||
            product.variants[0] ||
            null
        );
    }, [product, variantId]);

    const gallery = useMemo(() => {
        const imgs: string[] = [];
        if (product?.coverImage) imgs.push(product.coverImage);

        const vImgs = (selectedVariant?.images || []).filter(Boolean);
        for (const url of vImgs) if (!imgs.includes(url)) imgs.push(url);

        if (imgs.length === 0) return ["__placeholder__"];
        return imgs;
    }, [product?.coverImage, selectedVariant?.images]);

    useEffect(() => {
        setActiveImg(0);
    }, [variantId]);

    const unitPrice = useMemo(() => {
        const base = product?.price ?? 0;
        const extra = selectedVariant?.extraPrice ?? 0;
        return base + extra;
    }, [product?.price, selectedVariant?.extraPrice]);

    const total = useMemo(() => unitPrice * qty, [unitPrice, qty]);

    const canBuy = useMemo(() => {
        if (!product) return false;
        if (product.stocks <= 0) return false;
        if (qty <= 0) return false;
        return qty <= product.stocks;
    }, [product, qty]);

    function decQty() {
        setQty((q) => Math.max(1, q - 1));
    }
    function incQty() {
        if (!product) return;
        setQty((q) => Math.min(product.stocks || 1, q + 1));
    }

    function nextImg() {
        setActiveImg((i) => (i + 1) % gallery.length);
    }
    function prevImg() {
        setActiveImg((i) => (i - 1 + gallery.length) % gallery.length);
    }

    // ✅ REAL server add-to-cart
    async function onAddToCart() {
        if (!product) return;

        // variant fallback (if none)
        const v = selectedVariant || product.variants?.[0] || null;
        const vId = v?.id || "";
        const vName = v?.name || "Standard";

        if (product.stocks <= 0) return toast.error("Out of stock");
        if (qty > product.stocks) return toast.error("Quantity exceeds stocks");

        const t = toast.loading("Adding to cart...");
        try {
            await addItem({
                productId: product.id,
                qty,
                variantId: vId,
                variantName: vName,
            });

            toast.success("Added to cart ✅", { id: t });
        } catch (e: any) {
            toast.error(e?.message || "Add to cart failed", { id: t });
        }
    }

    // ✅ Buy now = add to cart then go checkout
    async function onBuyNow() {
        if (!product) return;

        const v = selectedVariant || product.variants?.[0] || null;
        const vId = v?.id || "";
        const vName = v?.name || "Standard";

        if (product.stocks <= 0) return toast.error("Out of stock");
        if (qty > product.stocks) return toast.error("Quantity exceeds stocks");

        const t = toast.loading("Preparing checkout...");
        try {
            await addItem({
                productId: product.id,
                qty,
                variantId: vId,
                variantName: vName,
            });

            toast.success("Redirecting to checkout…", { id: t });
            router.push("/checkout");
        } catch (e: any) {
            toast.error(e?.message || "Buy now failed", { id: t });
        }
    }

    if (loading) return <Skeleton />;

    if (!product) {
        return (
            <div className="mx-auto max-w-6xl px-6 py-10">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
          border border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90 transition"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                <div className="mt-6 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-6">
                    <p className="text-lg font-semibold text-[color:var(--foreground)]">
                        Product not available
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                        {errMsg || "This product might be removed or hidden."}
                    </p>

                    <button
                        onClick={() => router.push("/products")}
                        className="mt-4 rounded-full px-5 py-2.5 text-sm font-medium
            bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90 transition"
                    >
                        Go to products
                    </button>
                </div>
            </div>
        );
    }

    const perks = [
        { icon: <ShieldCheck size={18} />, title: "Secure", sub: "Safer checkout" },
        { icon: <Sparkles size={18} />, title: "Premium", sub: "Clean prints" },
        { icon: <BadgeCheck size={18} />, title: "Verified", sub: "Quality checks" },
    ];

    return (
        <div className="min-h-screen">
            <AppTopBar
                user={user}
                cartCount={0} // ✅ now real-ish
                onLogout={async () => {
                    await logout();
                    router.replace("/");
                }}
            />

            {/* background glow */}
            <div
                className="pointer-events-none fixed inset-0 -z-10
        bg-[radial-gradient(55%_45%_at_50%_10%,rgba(239,68,68,0.14),transparent_60%)]
        transition-colors duration-300"
            />
            <div
                className="pointer-events-none fixed inset-0 -z-10 opacity-[0.06]
        [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)]
        [background-size:84px_84px]"
            />

            <div className="mx-auto max-w-6xl px-6 py-10">
                {/* top row */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
            border border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90 transition"
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push("/products")}
                            className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
              border border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90 transition"
                        >
                            <Package size={16} />
                            Products
                        </button>

                        <button
                            onClick={() => router.push("/cart")}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
              bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90 transition"
                        >
                            <ShoppingBag size={16} />
                            Cart
                        </button>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    {/* LEFT: gallery */}
                    <div
                        className="
              rounded-[28px]
              border border-[color:var(--border)]
              bg-[color:var(--card-bg)]
              shadow-[var(--shadow)]
              overflow-hidden
            "
                    >
                        <div className="relative max-sm:h-[650px] h-[750px] bg-[color:var(--soft-bg)]">
                            {gallery[activeImg] === "__placeholder__" ? (
                                <div className="absolute inset-0 grid place-items-center">
                                    <span className="text-xs tracking-[0.25em] text-[color:var(--muted)]">
                                        IMAGE PLACEHOLDER
                                    </span>
                                </div>
                            ) : (
                                <Image
                                    src={gallery[activeImg]}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            )}

                            {gallery.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImg}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-2xl
                    border border-[color:var(--border)] bg-[color:var(--panel-bg)]/80 backdrop-blur
                    grid place-items-center hover:opacity-90 transition"
                                        aria-label="Prev image"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={nextImg}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-2xl
                    border border-[color:var(--border)] bg-[color:var(--panel-bg)]/80 backdrop-blur
                    grid place-items-center hover:opacity-90 transition"
                                        aria-label="Next image"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* thumbs */}
                        <div className="p-4 border-t border-[color:var(--border)]">
                            <div className="flex gap-2 overflow-x-auto">
                                {gallery.map((img, idx) => (
                                    <button
                                        key={`${img}-${idx}`}
                                        onClick={() => setActiveImg(idx)}
                                        className={clsx(
                                            "relative h-14 w-14 flex-none rounded-2xl overflow-hidden border",
                                            idx === activeImg
                                                ? "border-[color:var(--foreground)]/50"
                                                : "border-[color:var(--border)]",
                                            "bg-[color:var(--soft-bg)]"
                                        )}
                                        aria-label={`Image ${idx + 1}`}
                                    >
                                        {img === "__placeholder__" ? (
                                            <div className="absolute inset-0 grid place-items-center">
                                                <span className="text-[10px] tracking-[0.25em] text-[color:var(--muted)]">
                                                    IMG
                                                </span>
                                            </div>
                                        ) : (
                                            <Image src={img} alt="thumb" fill className="object-cover" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: info */}
                    <div
                        className="
              rounded-[28px]
              border border-[color:var(--border)]
              bg-[color:var(--panel-bg)]
              shadow-[var(--shadow)]
              p-6
            "
                    >
                        <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">
                            OPTIMAL CLOTHING
                        </p>

                        <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">
                            {product.name}
                        </h1>

                        <p className="mt-2 text-sm text-[color:var(--muted)]">
                            {product.description || "Premium cotton • clean print • streetwear fit"}
                        </p>

                        <div className="mt-5 flex items-end justify-between gap-3">
                            <div>
                                <p className="text-xs text-[color:var(--muted)]">Price</p>
                                <p className="mt-1 text-2xl font-semibold text-[color:var(--foreground)]">
                                    {money(unitPrice)}
                                </p>
                                {selectedVariant?.extraPrice ? (
                                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                                        Base {money(product.price)} + Variant {money(selectedVariant.extraPrice)}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                                        Base price
                                    </p>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="text-xs text-[color:var(--muted)]">Availability</p>
                                <p
                                    className={clsx(
                                        "mt-1 text-sm font-medium",
                                        product.stocks > 0
                                            ? "text-[color:var(--foreground)]"
                                            : "text-[color:var(--muted)]"
                                    )}
                                >
                                    {product.stocks > 0 ? `${product.stocks} in stock` : "Out of stock"}
                                </p>
                            </div>
                        </div>

                        {/* variants */}
                        <div className="mt-6">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Choose variant
                            </p>

                            <div className="mt-3 grid gap-2">
                                {(product.variants?.length
                                    ? product.variants
                                    : [{ id: "", name: "Standard", extraPrice: 0, images: [] }]
                                ).map((v) => {
                                    const active =
                                        (variantId || product.variants?.[0]?.id || "") === v.id;
                                    return (
                                        <button
                                            key={v.id || "standard"}
                                            onClick={() => setVariantId(v.id)}
                                            className={clsx(
                                                "text-left rounded-2xl border px-4 py-3 transition",
                                                active
                                                    ? "border-[color:var(--foreground)]/35 bg-[color:var(--card-bg)]"
                                                    : "border-[color:var(--border)] bg-[color:var(--soft-bg)] hover:opacity-90"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">
                                                        {v.name}
                                                    </p>
                                                    <p className="text-[11px] text-[color:var(--muted)] truncate">
                                                        {v.sku ? `SKU: ${v.sku}` : "SKU: —"} •{" "}
                                                        {v.images?.length ? `${v.images.length} images` : "no images"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {v.extraPrice ? (
                                                        <span className="text-xs font-medium text-[color:var(--foreground)]">
                                                            +{money(v.extraPrice)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[color:var(--muted)]">+0</span>
                                                    )}
                                                    {active ? <BadgeCheck size={18} className="opacity-80" /> : null}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* qty */}
                        <div className="mt-6">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                                Quantity
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-3">
                                <button
                                    onClick={decQty}
                                    className="h-10 w-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center hover:opacity-90 transition"
                                    aria-label="Decrease"
                                >
                                    <Minus size={16} />
                                </button>

                                <div className="text-center">
                                    <p className="text-2xl font-semibold text-[color:var(--foreground)]">
                                        {qty}
                                    </p>
                                    <p className="text-[11px] text-[color:var(--muted)]">
                                        {money(total)} total
                                    </p>
                                </div>

                                <button
                                    onClick={incQty}
                                    className="h-10 w-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center hover:opacity-90 transition"
                                    aria-label="Increase"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {qty > product.stocks && (
                                <p className="mt-2 text-xs text-red-500/90">
                                    Quantity is higher than available stocks.
                                </p>
                            )}
                        </div>

                        {/* CTA */}
                        <div className="mt-6 grid gap-2">
                            <button
                                onClick={onAddToCart}
                                disabled={!canBuy}
                                className={clsx(
                                    "rounded-2xl px-5 py-3 text-sm font-medium transition inline-flex items-center justify-center gap-2",
                                    canBuy
                                        ? "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90"
                                        : "opacity-60 cursor-not-allowed border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                )}
                            >
                                <ShoppingBag size={16} />
                                {product.stocks <= 0 ? "Out of stock" : "Add to cart"}
                            </button>

                            <button
                                onClick={onBuyNow}
                                disabled={!canBuy}
                                className={clsx(
                                    "rounded-2xl px-5 py-3 text-sm font-medium transition inline-flex items-center justify-center gap-2",
                                    canBuy
                                        ? "border border-[color:var(--btn-secondary-border)] bg-[color:var(--btn-secondary-bg)] text-[color:var(--btn-secondary-fg)] hover:opacity-90"
                                        : "opacity-60 cursor-not-allowed border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                )}
                            >
                                Buy now
                            </button>
                        </div>

                        {/* perks */}
                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                            {perks.map((p) => (
                                <div
                                    key={p.title}
                                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4"
                                >
                                    <div className="text-[color:var(--muted)]">{p.icon}</div>
                                    <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                                        {p.title}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">{p.sub}</p>
                                </div>
                            ))}
                        </div>

                        <p className="mt-5 text-[11px] text-[color:var(--muted)]">
                            Created: {product.createdAt} • Product ID: {product.id}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
