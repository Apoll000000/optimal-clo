"use client";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { addItem } from "@/services/cart";
import {
    Search,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    Package,
    CheckCircle2,
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
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

type Sort = "newest" | "price_asc" | "price_desc";

export default function ProductsPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    // protect route
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/products");
    }, [loading, user, router]);

    // data
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // controls
    const [q, setQ] = useState("");
    const [inStockOnly, setInStockOnly] = useState(false);
    const [sort, setSort] = useState<Sort>("newest");

    // pagination
    const PAGE_SIZE = 9;
    const [page, setPage] = useState(1);

    // debounce search
    const tRef = useRef<number | null>(null);

    async function loadProducts(search: string) {
        setLoadingProducts(true);
        try {
            // server supports q + status already in your admin dashboard
            const data = await api<any[]>(`/api/products?q=${encodeURIComponent(search)}&status=active`);
            setProducts((data || []).map(normalizeProduct));
        } catch (e: any) {
            toast.error(e?.message || "Failed to load products");
        } finally {
            setLoadingProducts(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        loadProducts("");
    }, [user]);

    useEffect(() => {
        if (!user) return;
        if (tRef.current) window.clearTimeout(tRef.current);

        tRef.current = window.setTimeout(() => {
            setPage(1);
            loadProducts(q);
        }, 250);

        return () => {
            if (tRef.current) window.clearTimeout(tRef.current);
        };
    }, [q, user]);

    const filteredSorted = useMemo(() => {
        let list = [...products];

        if (inStockOnly) list = list.filter((p) => p.stocks > 0);

        if (sort === "newest") {
            list.sort((a, b) => {
                const ad = new Date(a.createdAt).getTime();
                const bd = new Date(b.createdAt).getTime();
                if (!Number.isNaN(ad) && !Number.isNaN(bd)) return bd - ad;
                return 0;
            });
        } else if (sort === "price_asc") {
            list.sort((a, b) => a.price - b.price);
        } else if (sort === "price_desc") {
            list.sort((a, b) => b.price - a.price);
        }

        return list;
    }, [products, inStockOnly, sort]);

    const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
    const pageSafe = Math.min(page, totalPages);

    const pageItems = useMemo(() => {
        const start = (pageSafe - 1) * PAGE_SIZE;
        return filteredSorted.slice(start, start + PAGE_SIZE);
    }, [filteredSorted, pageSafe]);

    // ----- Variant modal for Add-to-cart -----
    const [variantModalOpen, setVariantModalOpen] = useState(false);
    const [modalProduct, setModalProduct] = useState<Product | null>(null);
    const [selectedVariantId, setSelectedVariantId] = useState<string>("");

    function openVariantModal(p: Product) {
        setModalProduct(p);
        const first = p.variants?.[0];
        setSelectedVariantId(first?.id || "");
        setVariantModalOpen(true);
    }

    function closeVariantModal() {
        setVariantModalOpen(false);
        setModalProduct(null);
        setSelectedVariantId("");
    }

    async function addToCartDirect(p: Product, variantId?: string) {
        if (p.stocks <= 0) return toast.error("Out of stock");

        // pick variant
        const v =
            (variantId ? p.variants.find((x) => x.id === variantId) : null) ||
            p.variants?.[0] ||
            null;

        const vId = v?.id || "";
        const vName = v?.name || "Standard";

        const t = toast.loading("Adding to cart...");
        try {
            await addItem({ productId: p.id, qty: 1, variantId: vId, variantName: vName });
            toast.success("Added to cart ✅", { id: t });
            // cart badge updates via CART_EVENT emitter inside services/cart
        } catch (e: any) {
            toast.error(e?.message || "Add to cart failed", { id: t });
        }
    }

    async function onAddClick(p: Product) {
        // ✅ requirement: if may multiple variants, choose first
        const hasChoices = (p.variants?.length || 0) > 0; // (safe UX; if you want strictly >2, change to >2)
        if (hasChoices) return openVariantModal(p);
        return addToCartDirect(p);
    }

    if (loading) return null;
    if (!user) return null;

    return (
        <div className="min-h-screen">
            <AppTopBar
                user={user}
                cartCount={0}
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

            <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-10">
                {/* header */}
                <div
                    className="
            rounded-[32px]
            border border-[color:var(--border)]
            bg-[color:var(--panel-bg)]
            backdrop-blur-2sm
            shadow-[var(--shadow)]
            p-6 sm:p-8
          "
                >
                    <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)]">Products</h1>
                            <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl">
                                Browse the latest drops, tap a product for full details, or add straight to cart in one click.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push("/app")}
                                className="rounded-full px-5 py-3 text-sm font-medium
                  border border-[color:var(--btn-secondary-border)]
                  bg-[color:var(--btn-secondary-bg)]
                  text-[color:var(--btn-secondary-fg)]
                  hover:opacity-90 transition
                "
                            >
                                Studio
                            </button>

                            <button
                                onClick={() => router.push("/cart")}
                                className="rounded-full px-5 py-3 text-sm font-medium
                  bg-[color:var(--btn-primary-bg)]
                  text-[color:var(--btn-primary-fg)]
                  hover:opacity-90 transition
                  inline-flex items-center gap-2
                "
                            >
                                <ShoppingBag size={16} />
                                Cart
                            </button>
                        </div>
                    </div>

                    {/* controls */}
                    <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_220px_220px]">
                        {/* search */}
                        <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search products, variants, SKU..."
                                className="
                  w-full rounded-2xl px-4 py-3 pl-10 text-sm
                  border border-[color:var(--border)] bg-[color:var(--soft-bg)]
                  text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]
                  outline-none focus:ring-2 focus:ring-red-500/30
                "
                            />
                        </div>

                        {/* filter: in stock */}
                        <button
                            type="button"
                            onClick={() => {
                                setPage(1);
                                setInStockOnly((p) => !p);
                            }}
                            className={clsx(
                                "rounded-2xl px-4 py-3 text-sm font-medium border transition flex items-center justify-between gap-2",
                                inStockOnly
                                    ? "border-transparent bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                                    : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90"
                            )}
                        >
                            <span className="inline-flex items-center gap-2">
                                <SlidersHorizontal size={16} />
                                In-stock only
                            </span>
                            <span className="text-xs opacity-80">{inStockOnly ? "ON" : "OFF"}</span>
                        </button>

                        {/* sort */}
                        <button
                            type="button"
                            onClick={() => {
                                setPage(1);
                                setSort((prev) => (prev === "newest" ? "price_asc" : prev === "price_asc" ? "price_desc" : "newest"));
                            }}
                            className="
                rounded-2xl px-4 py-3 text-sm font-medium
                border border-[color:var(--border)]
                bg-[color:var(--soft-bg)]
                text-[color:var(--foreground)]
                hover:opacity-90 transition
                flex items-center justify-between gap-2
              "
                            title="Tap to cycle sort"
                        >
                            <span className="inline-flex items-center gap-2">
                                <Package size={16} />
                                Sort
                            </span>
                            <span className="text-xs text-[color:var(--muted)]">
                                {sort === "newest" ? "Newest" : sort === "price_asc" ? "Price ↑" : "Price ↓"}
                            </span>
                        </button>
                    </div>
                </div>

                {/* results meta */}
                <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-[color:var(--muted)]">
                        {loadingProducts ? "Loading…" : `${filteredSorted.length} product${filteredSorted.length === 1 ? "" : "s"} found`}
                        {q.trim() ? ` for “${q.trim()}”` : ""}
                    </p>

                    {/* pagination top */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={pageSafe <= 1}
                            className={clsx(
                                "h-11 w-11 rounded-2xl border grid place-items-center transition",
                                pageSafe <= 1
                                    ? "opacity-50 cursor-not-allowed border-[color:var(--border)] bg-[color:var(--soft-bg)]"
                                    : "border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90"
                            )}
                            aria-label="Prev page"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] px-4 py-2 text-sm">
                            Page <span className="font-semibold">{pageSafe}</span> / {totalPages}
                        </div>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={pageSafe >= totalPages}
                            className={clsx(
                                "h-11 w-11 rounded-2xl border grid place-items-center transition",
                                pageSafe >= totalPages
                                    ? "opacity-50 cursor-not-allowed border-[color:var(--border)] bg-[color:var(--soft-bg)]"
                                    : "border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90"
                            )}
                            aria-label="Next page"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* grid */}
                <div className="mt-5 grid gap-4 grid-cols-1 max-sm:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                    {loadingProducts &&
                        Array.from({ length: 9 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-80 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--soft-bg)]"
                            />
                        ))}

                    {!loadingProducts &&
                        pageItems.map((p) => (
                            <div
                                key={p.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => router.push(`/products/${p.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        router.push(`/products/${p.id}`);
                                    }
                                }}
                                className="
    text-left group rounded-[28px]
    border border-[color:var(--border)]
    bg-[color:var(--card-bg)]
    shadow-[var(--shadow)]
    overflow-hidden
    hover:opacity-[0.985] transition
    cursor-pointer
  "
                            >
                                {/* image */}
                                <div className="relative h-90 max-sm:h-65 bg-[color:var(--soft-bg)] border-b border-[color:var(--border)]">
                                    {p.coverImage ? (
                                        <Image src={p.coverImage} alt={p.name} fill className="object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 grid place-items-center">
                                            <span className="text-xs tracking-[0.25em] text-[color:var(--muted)]">IMAGE PLACEHOLDER</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5">
                                    <p className="text-sm font-semibold text-[color:var(--foreground)] line-clamp-1">{p.name}</p>
                                    <p className="mt-1 text-xs text-[color:var(--muted)] line-clamp-2">
                                        {p.description || "Premium cotton • clean print • streetwear fit"}
                                    </p>

                                    <div className="mt-4 flex max-sm:flex-col items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-[color:var(--foreground)]">{money(p.price)}</p>
                                            <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                                                {p.stocks > 0 ? `${p.stocks} in stock` : "Out of stock"} • {p.variants?.length ?? 0} variants
                                            </p>
                                        </div>

                                        {/* add to cart */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation(); // ✅ prevents card click
                                                onAddClick(p);
                                            }}
                                            disabled={p.stocks <= 0}
                                            className={clsx(
                                                "rounded-full px-4 py-2 text-xs font-medium transition inline-flex items-center gap-2",
                                                p.stocks <= 0
                                                    ? "opacity-60 cursor-not-allowed border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                                    : "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90"
                                            )}
                                            aria-label="Add to cart"
                                        >
                                            <ShoppingBag size={14} />
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                    {!loadingProducts && filteredSorted.length === 0 && (
                        <div className="sm:col-span-2 lg:col-span-3 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] p-10 text-center">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">No products found</p>
                            <p className="mt-2 text-sm text-[color:var(--muted)]">
                                Try a different keyword, or disable filters.
                            </p>
                        </div>
                    )}
                </div>

                {/* pagination bottom */}
                {filteredSorted.length > 0 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={pageSafe <= 1}
                            className={clsx(
                                "h-11 w-11 rounded-2xl border grid place-items-center transition",
                                pageSafe <= 1
                                    ? "opacity-50 cursor-not-allowed border-[color:var(--border)] bg-[color:var(--soft-bg)]"
                                    : "border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90"
                            )}
                            aria-label="Prev page"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] px-5 py-2 text-sm">
                            Page <span className="font-semibold">{pageSafe}</span> / {totalPages}
                        </div>

                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={pageSafe >= totalPages}
                            className={clsx(
                                "h-11 w-11 rounded-2xl border grid place-items-center transition",
                                pageSafe >= totalPages
                                    ? "opacity-50 cursor-not-allowed border-[color:var(--border)] bg-[color:var(--soft-bg)]"
                                    : "border-[color:var(--border)] bg-[color:var(--card-bg)] hover:opacity-90"
                            )}
                            aria-label="Next page"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {/* Variant Modal */}
                {variantModalOpen && modalProduct && (
                    <div
                        className="fixed inset-0 z-[90]"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) closeVariantModal();
                        }}
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <div className="relative mx-auto w-full max-w-lg px-4 sm:px-6 py-8">
                            <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] shadow-[var(--shadow)] overflow-hidden">
                                <div className="p-5 sm:p-6 border-b border-[color:var(--border)]">
                                    <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">CHOOSE VARIANT</p>
                                    <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">{modalProduct.name}</h3>
                                    <p className="mt-2 text-sm text-[color:var(--muted)]">
                                        Select a variant before adding to cart.
                                    </p>
                                </div>

                                <div className="p-5 sm:p-6 space-y-2">
                                    {modalProduct.variants.map((v) => {
                                        const active = selectedVariantId === v.id;
                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => setSelectedVariantId(v.id)}
                                                className={clsx(
                                                    "w-full text-left rounded-2xl border px-4 py-3 transition",
                                                    active
                                                        ? "border-[color:var(--foreground)]/35 bg-[color:var(--card-bg)]"
                                                        : "border-[color:var(--border)] bg-[color:var(--soft-bg)] hover:opacity-90"
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">{v.name}</p>
                                                        <p className="mt-1 text-[11px] text-[color:var(--muted)] truncate">
                                                            {v.sku ? `SKU: ${v.sku}` : "SKU: —"} • {v.extraPrice ? `+${money(v.extraPrice)}` : "+0"}
                                                        </p>
                                                    </div>
                                                    {active ? <CheckCircle2 size={18} className="opacity-80" /> : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="p-5 sm:p-6 border-t border-[color:var(--border)] flex items-center justify-between gap-2">
                                    <button
                                        onClick={closeVariantModal}
                                        className="rounded-2xl px-4 py-3 text-sm font-medium
                      border border-[color:var(--border)] bg-[color:var(--soft-bg)]
                      text-[color:var(--foreground)] hover:opacity-90 transition
                    "
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={async () => {
                                            const p = modalProduct;
                                            const vId = selectedVariantId || p.variants?.[0]?.id || "";
                                            closeVariantModal();
                                            await addToCartDirect(p, vId);
                                        }}
                                        className="
                      rounded-2xl px-5 py-3 text-sm font-medium
                      bg-[color:var(--btn-primary-bg)]
                      text-[color:var(--btn-primary-fg)]
                      hover:opacity-90 transition
                      inline-flex items-center gap-2
                    "
                                    >
                                        <ShoppingBag size={16} />
                                        Add to cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="mt-14 text-center text-xs text-[color:var(--muted-2)]">
                    © {new Date().getFullYear()} OPTIMAL CLOTHING — Studio
                </footer>
            </div>
        </div>
    );
}
