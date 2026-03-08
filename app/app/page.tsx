"use client";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getMyOrders } from "@/services/orders";
import { getCart } from "@/services/cart";
import {
    Package,
    Truck,
    Wand2,
    Bookmark,
    ShoppingBag,
    ReceiptText,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    ShieldCheck,
    BadgeCheck,
    ArrowUpRight
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
            images: v.images ?? [],
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

// ✅ Global event name for cart updates
const CART_EVENT = "optimal:cart-updated";

function IconAction({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="
        group relative
        h-12 w-12 sm:h-11 sm:w-11
        rounded-2xl
        border border-[color:var(--border)]
        bg-[color:var(--card-bg)]
        shadow-[var(--shadow)]
        grid place-items-center
        hover:opacity-90 transition
      "
            aria-label={label}
        >
            {icon}
            <span
                className="
          pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2
          whitespace-nowrap
          rounded-full border border-[color:var(--border)]
          bg-[color:var(--panel-bg)]
          px-3 py-1 text-[11px]
          text-[color:var(--foreground)]
          opacity-0 translate-y-1
          group-hover:opacity-100 group-hover:translate-y-0
          transition
        "
            >
                {label}
            </span>
        </button>
    );
}

function MiniStat({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div
            className="
        group relative
        rounded-2xl border border-[color:var(--border)]
        bg-[color:var(--card-bg)]
        p-4
      "
        >
            <div className="flex items-center justify-between">
                <div className="text-[color:var(--muted)]">{icon}</div>
                <span className="text-2xl font-semibold text-[color:var(--foreground)]">{value}</span>
            </div>

            <span
                className="
          pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2
          whitespace-nowrap
          rounded-full border border-[color:var(--border)]
          bg-[color:var(--panel-bg)]
          px-3 py-1 text-[11px]
          text-[color:var(--foreground)]
          opacity-0 translate-y-1
          group-hover:opacity-100 group-hover:translate-y-0
          transition
        "
            >
                {label}
            </span>
        </div>
    );
}

export default function AppHome() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    // protect route
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/app");
    }, [loading, user, router]);

    // products
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // stats
    const [cartCount, setCartCount] = useState(0);
    const [ordersCount, setOrdersCount] = useState(0);
    const [savedCount] = useState(0); // placeholder for now

    async function loadProducts() {
        setLoadingProducts(true);
        try {
            const data = await api<any[]>(`/api/products?q=&status=active`);
            setProducts((data || []).map(normalizeProduct));
        } catch (e: any) {
            toast.error(e?.message || "Failed to load products");
        } finally {
            setLoadingProducts(false);
        }
    }

    async function refreshOrdersCount() {
        try {
            if (!user?.email) return;
            const orders = await getMyOrders(user.email);
            setOrdersCount(orders.length);
        } catch {
            // ignore silently (or toast if you want)
        }
    }


    // ✅ cart count sync (server)
    async function refreshCartCount() {
        try {
            const items = await getCart();
            setCartCount(items.reduce((sum, it) => sum + (it.qty || 0), 0));
        } catch {
            // ignore silently
        }
    }

    useEffect(() => {
        if (!user) return;
        loadProducts();
        refreshCartCount();
        refreshOrdersCount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // ✅ live update cart count when cart changes anywhere
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

    // ✅ featured: always 3, most recent
    const featured = useMemo(() => {
        const sorted = [...products].sort((a, b) => {
            const ad = new Date(a.createdAt).getTime();
            const bd = new Date(b.createdAt).getTime();
            if (!Number.isNaN(ad) && !Number.isNaN(bd)) return bd - ad;
            return 0;
        });
        return sorted.slice(0, 3);
    }, [products]);

    // ✅ carousel slides (WITH IMAGE SRC READY)
    const slides = useMemo(
        () => [
            {
                title: "New Drop",
                subtitle: "Fresh graphics curated for the week",
                tag: "DROP",
                img: "https://images.pexels.com/photos/18186105/pexels-photo-18186105.jpeg", // 👈 palitan mo later
            },
            {
                title: "Monochrome Series",
                subtitle: "High-contrast pieces for clean fits",
                tag: "B/W",
                img: "https://images.pexels.com/photos/581087/pexels-photo-581087.jpeg",
            },
            {
                title: "Artist Collab",
                subtitle: "Limited releases from featured creators",
                tag: "COLLAB",
                img: "https://images.pexels.com/photos/1311590/pexels-photo-1311590.jpeg",
            },
            {
                title: "Essentials",
                subtitle: "Minimal staples you can wear daily",
                tag: "CORE",
                img: "https://images.pexels.com/photos/4440566/pexels-photo-4440566.jpeg",
            },
        ],
        []
    );

    const [slide, setSlide] = useState(0);
    const [paused, setPaused] = useState(false);
    const autoRef = useRef<number | null>(null);

    function nextSlide() {
        setSlide((s) => (s + 1) % slides.length);
    }
    function prevSlide() {
        setSlide((s) => (s - 1 + slides.length) % slides.length);
    }

    // ✅ auto-rotate (smooth)
    useEffect(() => {
        if (paused) return;

        if (autoRef.current) window.clearInterval(autoRef.current);
        autoRef.current = window.setInterval(() => {
            setSlide((s) => (s + 1) % slides.length);
        }, 4500);

        return () => {
            if (autoRef.current) window.clearInterval(autoRef.current);
            autoRef.current = null;
        };
    }, [paused, slides.length]);

    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="mx-auto max-w-6xl px-6 py-14">
                    <div className="h-10 w-60 rounded-2xl bg-[color:var(--soft-bg)]" />
                    <div className="mt-6 h-36 rounded-3xl bg-[color:var(--soft-bg)]" />
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-56 rounded-3xl bg-[color:var(--soft-bg)]" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

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

            <div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
                {/* hero */}
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
                    <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">YOUR SPACE</p>

                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)]">
                                Welcome back, {user.name.split(" ")[0]}.
                            </h1>
                            <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl">
                                Discover fresh releases, save what you love, and build your cart—ready for clean prints and clean fits.
                            </p>
                        </div>

                        {/* icon actions */}
                        <div className="flex items-center gap-2">
                            <IconAction
                                icon={<Package size={18} className="opacity-90" />}
                                label="Products"
                                onClick={() => router.push("/products")}
                            />
                            <IconAction
                                icon={<Truck size={18} className="opacity-90" />}
                                label="Orders"
                                onClick={() => router.push("/orders")}
                            />
                            <IconAction
                                icon={<Wand2 size={18} className="opacity-90" />}
                                label="Design Studio"
                                onClick={() => router.push("/design-studio")}
                            />
                        </div>
                    </div>

                    {/* micro stats */}
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <MiniStat icon={<Bookmark size={18} />} label="Saved designs" value={String(savedCount)} />
                        <MiniStat icon={<ShoppingBag size={18} />} label="In cart" value={String(cartCount)} />
                        <MiniStat icon={<ReceiptText size={18} />} label="Orders" value={String(ordersCount)} />
                    </div>
                </div>

                {/* --- carousel --- */}
                <div className="mt-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Spotlight</h2>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">
                                Curated highlights tailored for Optimal CLothing Users.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={prevSlide}
                                className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center hover:opacity-90 transition"
                                aria-label="Previous"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center hover:opacity-90 transition"
                                aria-label="Next"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    <div
                        className="
              mt-4 rounded-[32px]
              border border-[color:var(--border)]
              bg-[color:var(--card-bg)]
              shadow-[var(--shadow)]
              overflow-hidden
            "
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                    >
                        <div className="relative h-[450px] max-sm:h-[300px]">
                            {/* ✅ REAL SLIDER TRACK */}
                            <div
                                className="absolute inset-0 flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                style={{ transform: `translateX(-${slide * 100}%)` }}
                            >
                                {slides.map((s, idx) => (
                                    <div key={idx} className="relative h-full w-full flex-none">
                                        {/* ✅ READY IMAGE TAG (palitan src later) */}
                                        <Image src={s.img} alt={s.title} fill className="object-cover" priority={idx === 0} />

                                        {/* soft overlay */}
                                        <div className="absolute inset-0 bg-black/25" />

                                        {/* your original “panel box” content (same premium style) */}
                                        <div className="absolute inset-0 p-6 sm:p-8">
                                            <div className="h-full w-full rounded-[28px] border border-[color:var(--border)] bg-[color:var(--panel-bg)] grid place-items-center">
                                                <div className="text-center">
                                                    <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">{s.tag}</p>
                                                    <p className="mt-2 text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">{s.title}</p>
                                                    <p className="mt-2 text-sm text-[color:var(--muted)]">{s.subtitle}</p>
                                                    <button
                                                        onClick={() => router.push("/products")}
                                                        className="
                              mt-5 inline-flex items-center gap-2
                              rounded-full px-5 py-2.5 text-sm font-medium
                              bg-[color:var(--btn-primary-bg)]
                              text-[color:var(--btn-primary-fg)]
                              hover:opacity-90 transition
                            "
                                                    >
                                                        Explore <ArrowUpRight size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* glow */}
                                        <div
                                            className="
                        pointer-events-none absolute -inset-24
                        rotate-12 opacity-60
                        bg-[radial-gradient(circle,rgba(239,68,68,0.16),transparent_60%)]
                      "
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* dots */}
                        <div className="px-6 pb-5">
                            <div className="flex items-center gap-2">
                                {slides.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSlide(i)}
                                        className={clsx(
                                            "h-2.5 rounded-full transition",
                                            i === slide ? "w-8 bg-[color:var(--foreground)]/70" : "w-2.5 bg-[color:var(--border)]"
                                        )}
                                        aria-label={`Go to slide ${i + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* trust / benefits */}
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                        { icon: <BadgeCheck size={18} />, title: "Quality-first", desc: "Designed to look sharp on screen and on fabric." },
                        { icon: <ShieldCheck size={18} />, title: "Secure by default", desc: "Account-based cart and consistent order tracking." },
                        { icon: <Sparkles size={18} />, title: "Fresh releases", desc: "New designs land regularly—keep checking the feed." },
                    ].map((b) => (
                        <div
                            key={b.title}
                            className="
                rounded-[28px]
                border border-[color:var(--border)]
                bg-[color:var(--panel-bg)]
                shadow-[var(--shadow)]
                p-4
              "
                        >
                            <div className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] grid place-items-center text-[color:var(--muted)]">
                                {b.icon}
                            </div>
                            <p className="mt-4 text-sm font-semibold text-[color:var(--foreground)]">{b.title}</p>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">{b.desc}</p>
                        </div>
                    ))}
                </div>

                {/* --- PRO subscription promo --- */}
                <div
                    className="
    mt-8 rounded-[32px]
    border border-[color:var(--border)]
    bg-[color:var(--card-bg)]
    shadow-[var(--shadow)]
    overflow-hidden
  "
                >
                    <div className="relative">
                        {/* Background image (decor only) */}
                        <div className="pointer-events-none absolute inset-0">
                            <Image
                                src={"https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg"} // 👈 palitan mo later
                                alt=""
                                fill
                                className="object-cover"
                                priority={false}
                            />
                            {/* overlays (must NOT block clicks) */}
                            <div className="absolute inset-0 bg-black/15" />
                            <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(239,68,68,0.22),transparent_55%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(239,68,68,0.18),transparent_60%)]" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 p-5 sm:p-8">
                            <div
                                className="
          rounded-[28px]
          border border-[color:var(--border)]
          bg-[color:var(--panel-bg)]
          backdrop-blur-2sm
          shadow-[var(--shadow)]
          p-5 sm:p-7
        "
                            >
                                <div className="flex flex-col gap-5 sm:gap-6">
                                    {/* Header row */}
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">
                                                SUBSCRIPTION
                                            </p>

                                            <h3 className="mt-2 text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">
                                                Go <span className="text-red-500/90">Optimal Pro</span>
                                            </h3>

                                            <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl">
                                                Get access to <span className="text-[color:var(--foreground)] font-medium">limited-edition designs</span> —
                                                exclusive drops only available to Pro members. Early access, special releases, and pro-only bundles.
                                            </p>
                                        </div>

                                        {/* badge (won’t overlap now) */}
                                        <div
                                            className="
                w-fit
                rounded-full px-4 py-2
                border border-[color:var(--border)]
                bg-[color:var(--soft-bg)]
                text-[color:var(--foreground)]
                text-xs font-medium
              "
                                        >
                                            PRO ACCESS
                                        </div>
                                    </div>

                                    {/* Perks (responsive: stacks on small, 3 cols on desktop) */}
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {[
                                            { t: "Exclusive drops", d: "Pro-only limited releases." },
                                            { t: "Early access", d: "See drops before public." },
                                            { t: "Member perks", d: "Special bundles & deals." },
                                        ].map((x) => (
                                            <div
                                                key={x.t}
                                                className="
                  rounded-2xl
                  border border-[color:var(--border)]
                  bg-[color:var(--card-bg)]
                  p-4
                "
                                            >
                                                <p className="text-sm font-semibold text-[color:var(--foreground)]">{x.t}</p>
                                                <p className="mt-1 text-xs text-[color:var(--muted)]">{x.d}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA row (always clickable) */}
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs text-[color:var(--muted)]">
                                            Enjoy VIP and Early Access with PRO
                                        </p>

                                        <button
                                            onClick={() => router.push("/subscriptions")}
                                            className="
                relative z-20
                inline-flex items-center gap-2
                rounded-full px-5 py-3 text-sm font-medium
                bg-[color:var(--btn-primary-bg)]
                text-[color:var(--btn-primary-fg)]
                hover:opacity-90 transition
              "
                                            type="button"
                                        >
                                            Join Pro <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* extra glow (decor only, no click blocking) */}
                        <div
                            className="
        pointer-events-none absolute -inset-24
        rotate-12 opacity-60
        bg-[radial-gradient(circle,rgba(239,68,68,0.14),transparent_60%)]
      "
                        />
                    </div>
                </div>



                {/* --- shop by category (same design, but image tag ready + hover parallax) --- */}
                <div className="mt-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Shop by category</h2>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">
                                Pick a lane—graphic statements, minimal staples, or heavier layers.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
                        {[
                            {
                                title: "Graphic Tees",
                                desc: "Bold prints • high contrast • drop pieces",
                                href: "/products",
                                img: "https://images.pexels.com/photos/2294342/pexels-photo-2294342.jpeg", // 👈 palitan later
                            },
                            {
                                title: "Minimal Tees",
                                desc: "Clean essentials • daily rotation • easy fit",
                                href: "/products",
                                img: "https://images.pexels.com/photos/5746087/pexels-photo-5746087.jpeg",
                            },
                            {
                                title: "Hoodies",
                                desc: "Heavier feel • premium comfort • street-ready",
                                href: "/products",
                                img: "https://images.pexels.com/photos/12555806/pexels-photo-12555806.png",
                            },
                        ].map((c) => (
                            <button
                                key={c.title}
                                onClick={() => router.push(c.href)}
                                className="
                  group text-left
                  rounded-[28px]
                  border border-[color:var(--border)]
                  bg-[color:var(--card-bg)]
                  shadow-[var(--shadow)]
                  p-4
                  hover:opacity-[0.98] transition
                "
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">{c.title}</p>
                                        <p className="mt-1 text-xs text-[color:var(--muted)]">{c.desc}</p>
                                    </div>
                                    <span className="h-11 w-11 rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center">
                                        <Sparkles size={18} className="opacity-80" />
                                    </span>
                                </div>

                                {/* premium preview block (SAME), but with Image + hover parallax */}
                                <div className="relative mt-5 max-sm:h-78 sm:h-48 md:h-68 lg:h-70 h-70 rounded-3xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] overflow-hidden">
                                    {/* ✅ IMAGE READY (hover parallax vibe) */}
                                    <Image
                                        src={c.img}
                                        alt={c.title}
                                        fill
                                        className="
                      object-cover
                      transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]
                      group-hover:scale-[1.12]
                      group-hover:-translate-y-2
                    "
                                    />

                                    {/* soft overlays for premium look */}
                                    <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.14),transparent_55%)]" />
                                    <div className="absolute inset-0 bg-black/10" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* featured products */}
                <div className="mt-8 flex items-end justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Featured products</h2>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">
                            Our newest picks—crafted for clean prints and a strong silhouette.
                        </p>
                    </div>

                    <button
                        onClick={() => router.push("/products")}
                        className="
              hidden sm:inline-flex
              rounded-full px-5 py-2.5 text-sm font-medium
              border border-[color:var(--btn-secondary-border)]
              bg-[color:var(--btn-secondary-bg)]
              text-[color:var(--btn-secondary-fg)]
              hover:opacity-90 transition
            "
                    >
                        View all
                    </button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {loadingProducts &&
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-72 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--soft-bg)]" />
                        ))}

                    {!loadingProducts &&
                        featured.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => router.push(`/products/${p.id}`)}
                                className="
                  text-left group rounded-[28px]
                  border border-[color:var(--border)]
                  bg-[color:var(--card-bg)]
                  shadow-[var(--shadow)]
                  overflow-hidden
                  hover:opacity-[0.98] transition
                "
                            >
                                <div className="relative h-90 max-sm:h-88 bg-[color:var(--soft-bg)] border-b border-[color:var(--border)]">
                                    {p.coverImage ? (
                                        <Image src={p.coverImage} alt={p.name} fill className="object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 grid place-items-center">
                                            <span className="text-xs tracking-[0.25em] text-[color:var(--muted)]">NO IMAGE</span>
                                        </div>
                                    )}

                                    <div
                                        className="
                      pointer-events-none absolute -inset-24
                      rotate-12 opacity-0 group-hover:opacity-100 transition
                      bg-[radial-gradient(circle,rgba(239,68,68,0.14),transparent_60%)]
                    "
                                    />
                                </div>

                                <div className="p-5">
                                    <p className="text-sm font-medium text-[color:var(--foreground)] line-clamp-1">{p.name}</p>
                                    <p className="mt-1 text-xs text-[color:var(--muted)] line-clamp-2">
                                        {p.description || "Premium cotton • clean print • streetwear fit"}
                                    </p>

                                    <div className="mt-4 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">{money(p.price)}</p>

                                        <span
                                            className={clsx(
                                                "rounded-full px-4 py-2 text-xs font-medium transition",
                                                p.stocks <= 0
                                                    ? "opacity-60 border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                                    : "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                                            )}
                                        >
                                            {p.stocks <= 0 ? "Out of stock" : "View"}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                                        {p.stocks > 0 ? `${p.stocks} in stock` : "Restock soon"} • {p.variants?.length ?? 0} variants
                                    </p>
                                </div>
                            </button>
                        ))}
                </div>

                {/* premium statement section after featured */}
                <div
                    className="
            mt-8 rounded-[32px]
            border border-[color:var(--border)]
            bg-[color:var(--panel-bg)]
            shadow-[var(--shadow)]
            overflow-hidden
          "
                >
                    <div className="relative p-6 sm:p-8">
                        <div
                            className="
                pointer-events-none absolute -inset-24
                bg-[radial-gradient(circle,rgba(239,68,68,0.14),transparent_60%)]
              "
                        />
                        <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)] relative">STUDIO NOTE</p>
                        <h3 className="mt-3 text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)] relative">
                            Wear the concept. Keep it clean.
                        </h3>
                        <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl relative">
                            Optimal Clothing focuses on bold graphics, premium feel, and a silhouette that works with any fit.
                            Build your cart, checkout fast, and keep an eye on upcoming drops.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2 relative">
                            <button
                                onClick={() => router.push("/products")}
                                className="
                  inline-flex items-center gap-2
                  rounded-full px-5 py-3 text-sm font-medium
                  bg-[color:var(--btn-primary-bg)]
                  text-[color:var(--btn-primary-fg)]
                  hover:opacity-90 transition
                "
                            >
                                Browse products <ArrowUpRight size={16} />
                            </button>
                            <button
                                onClick={() => router.push("/cart")}
                                className="
                  inline-flex items-center gap-2
                  rounded-full px-5 py-3 text-sm font-medium
                  border border-[color:var(--btn-secondary-border)]
                  bg-[color:var(--btn-secondary-bg)]
                  text-[color:var(--btn-secondary-fg)]
                  hover:opacity-90 transition
                "
                            >
                                Open cart <ShoppingBag size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="h-px w-full bg-[color:var(--border)]" />

                    <div className="grid gap-3 sm:grid-cols-3 p-6 sm:p-8">
                        {[
                            { t: "Premium output", d: "Consistent print quality and clean contrast." },
                            { t: "Fast browsing", d: "Simple product flow from home → details → cart." },
                            { t: "Drop-ready", d: "New designs can be published instantly." },
                        ].map((x) => (
                            <div key={x.t} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4">
                                <p className="text-sm font-semibold text-[color:var(--foreground)]">{x.t}</p>
                                <p className="mt-1 text-xs text-[color:var(--muted)]">{x.d}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="mt-14 text-center text-xs text-[color:var(--muted-2)]">
                    © {new Date().getFullYear()} OPTIMAL CLOTHING — Studio
                </footer>
            </div>
        </div>
    );
}
