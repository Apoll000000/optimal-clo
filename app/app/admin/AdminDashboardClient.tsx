"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
    Plus,
    Search,
    SlidersHorizontal,
    Package,
    Truck,
    Users,
    BadgeCheck,
    PencilLine,
    Image as ImageIcon,
    ChevronDown,
    CheckCircle2,
    Trash2
} from "lucide-react";
import { uploadImage } from "@/lib/upload";

type AuthUser = {
    id: string;
    email: string;
    name: string;
    avatar?: string;
};

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

type Order = {
    id: string;
    customerName: string;
    customerEmail: string;
    items: { productName: string; variantName?: string; qty: number; unitPrice: number }[];
    total: number;
    status: "pending" | "approved" | "shipped" | "delivered" | "cancelled";
    tracking?: string;
    courier?: string;
    updatedAt: string;
};

type UserRow = {
    id: string;
    name: string;
    email: string;
    orders: number;
    spent: number;
    joinedAt: string;
};

type PlanKey = "deluxe" | "grand" | "royalty";

type SubscriptionPlan = {
    key: PlanKey;
    name: string;
    currency: "PHP";
    monthly: number;
    annual: number;

    // NEW
    autoAnnual?: boolean;          // default true
    annualDiscountPct?: number;    // 0-100

    updatedAt?: string;
};


type SubscriberRow = {
    id: string;
    name: string;
    email: string;
    tier: PlanKey;
    billingCycle: "monthly" | "annual";
    status: "active" | "expired" | "cancelled";
    endsAt: string; // ISO
    daysLeft: number; // computed server-side OR client-side
};

const DEFAULT_PLANS: SubscriptionPlan[] = [
    { key: "deluxe", name: "Deluxe", currency: "PHP", monthly: 0, annual: 0, autoAnnual: true, annualDiscountPct: 0, updatedAt: "" },
    { key: "grand", name: "Grand", currency: "PHP", monthly: 0, annual: 0, autoAnnual: true, annualDiscountPct: 0, updatedAt: "" },
    { key: "royalty", name: "Royalty", currency: "PHP", monthly: 0, annual: 0, autoAnnual: true, annualDiscountPct: 0, updatedAt: "" },
];

function mergePlans(server: SubscriptionPlan[]) {
    const map = new Map(server.map((p) => [p.key, p]));
    return DEFAULT_PLANS.map((d) => ({ ...d, ...(map.get(d.key) || {}) }));
}



type Props = {
    user: AuthUser;
};

function money(n: number) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
    return (
        <span
            className="
        inline-flex items-center rounded-full
        border border-[color:var(--border)]
        bg-[color:var(--soft-bg)]
        px-3 py-1 text-[11px]
        text-[color:var(--muted)]
      "
        >
            {children}
        </span>
    );
}

function SectionCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="
        rounded-[28px]
        border border-[color:var(--border)]
        bg-[color:var(--panel-bg)]
        backdrop-blur-2sm
        shadow-[var(--shadow)]
        p-5 sm:p-6
      "
        >
            {children}
        </div>
    );
}

function SoftCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="
        rounded-2xl
        border border-[color:var(--border)]
        bg-[color:var(--card-bg)]
        p-5
      "
        >
            {children}
        </div>
    );
}

function SmallButton({
    children,
    onClick,
    type = "button",
    variant = "soft",
    disabled,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: "button" | "submit";
    variant?: "soft" | "primary" | "ghost";
    disabled?: boolean;
}) {
    const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition";
    const soft =
        "border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90";
    const primary = "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90";
    const ghost = "text-[color:var(--foreground)] hover:bg-[color:var(--soft-bg)]";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                base,
                variant === "primary" ? primary : variant === "ghost" ? ghost : soft,
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            {children}
        </button>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-medium text-[color:var(--foreground)]">{label}</p>
                {hint ? <p className="text-[11px] text-[color:var(--muted)]">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={clsx(
                "w-full rounded-2xl px-4 py-3 text-sm",
                "border border-[color:var(--border)] bg-[color:var(--soft-bg)]",
                "text-[color:var(--foreground)] placeholder:text-[color:var(--muted)]",
                "outline-none focus:ring-2 focus:ring-red-500/30",
                props.className
            )}
        />
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

function Select({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <button
            type="button"
            className="
        w-full rounded-2xl px-4 py-3 text-sm
        border border-[color:var(--border)] bg-[color:var(--soft-bg)]
        text-[color:var(--foreground)]
        flex items-center justify-between
        hover:opacity-90 transition
      "
            onClick={() => {
                const idx = options.findIndex((o) => o.value === value);
                const next = options[(idx + 1) % options.length];
                onChange(next.value);
            }}
            title="Tap to change"
        >
            <span>{options.find((o) => o.value === value)?.label}</span>
            <ChevronDown size={16} className="opacity-70" />
        </button>
    );
}

// ---- tiny helpers for mapping mongo docs ----
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
            images: v.images ?? [""],
        })),
        createdAt: isoDate(p.createdAt),
    };
}

function normalizeOrder(o: any): Order {
    return {
        id: o._id ?? o.id,
        customerName: o.customerName ?? "",
        customerEmail: o.customerEmail ?? "",
        items: (o.items ?? []).map((it: any) => ({
            productName: it.productName ?? "",
            variantName: it.variantName ?? "",
            qty: Number(it.qty ?? 0),
            unitPrice: Number(it.unitPrice ?? 0),
        })),
        total: Number(o.total ?? 0),
        status: o.status ?? "pending",
        tracking: o.tracking ?? "",
        courier: o.courier ?? "",
        updatedAt: isoDate(o.updatedAt),
    };
}

export default function AdminDashboardClient({ user }: Props) {
    const [tab, setTab] = useState<"products" | "orders" | "users" | "subscriptions">("products");

    const COL_PRODUCTS =
        "grid-cols-[minmax(260px,1.4fr)_minmax(140px,0.7fr)_minmax(120px,0.6fr)_minmax(160px,0.8fr)_minmax(140px,0.7fr)_minmax(160px,0.7fr)]";

    const COL_ORDERS =
        "grid-cols-[minmax(240px,1fr)_minmax(200px,0.9fr)_minmax(120px,0.7fr)_minmax(260px,1fr)_minmax(160px,0.7fr)]";

    const COL_USERS = "grid-cols-[minmax(240px,1fr)_minmax(120px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)]";

    // ---- server data ----
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);

    // ---- loading states ----
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // ---- Products UI state ----
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");

    const [editId, setEditId] = useState<string | null>(null);

    // ---- Orders editing (manual save) ----
    const [orderDrafts, setOrderDrafts] = useState<Record<string, { courier: string; tracking: string }>>({});
    const [savingOrders, setSavingOrders] = useState<Record<string, boolean>>({});



    // ---- Add Product Form state ----
    const [formOpen, setFormOpen] = useState(false);
    const [pName, setPName] = useState("");
    const [pDesc, setPDesc] = useState("");
    const [pPrice, setPPrice] = useState<number>(499);
    const [pStocks, setPStocks] = useState<number>(10);
    const [pStatus, setPStatus] = useState<"active" | "draft">("draft");
    const [pVariants, setPVariants] = useState<Variant[]>([
        { id: crypto.randomUUID(), name: "Standard", extraPrice: 0, sku: "", images: [""] },
    ]);

    // ---- Add prduct cover  ----
    const [coverUploading, setCoverUploading] = useState(false);
    const [coverUrl, setCoverUrl] = useState<string>("");

    const [variantUploading, setVariantUploading] = useState<Record<string, boolean>>({});



    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);




    function resetForm() {
        setEditId(null);
        setPName("");
        setPDesc("");
        setPPrice(499);
        setPStocks(10);
        setPStatus("draft");
        setPVariants([{ id: crypto.randomUUID(), name: "Standard", extraPrice: 0, sku: "", images: [""] }]);
        setCoverUrl("");
    }

    function addVariant() {
        setPVariants((prev) => [
            ...prev,
            { id: crypto.randomUUID(), name: `Variant ${prev.length + 1}`, extraPrice: 0, sku: "", images: [""] },
        ]);
    }

    function removeVariant(id: string) {
        setPVariants((prev) => (prev.length <= 1 ? prev : prev.filter((v) => v.id !== id)));
    }

    function addVariantImage(variantId: string) {
        setPVariants((prev) => prev.map((v) => (v.id === variantId ? { ...v, images: [...v.images, ""] } : v)));
    }

    async function loadProducts() {
        setLoadingProducts(true);
        try {
            const data = await api<any[]>(
                `/api/products?q=${encodeURIComponent(q)}&status=${encodeURIComponent(statusFilter)}`
            );
            setProducts(data.map(normalizeProduct));
        } catch (e: any) {
            toast.error(e?.message || "Failed to load products");
        } finally {
            setLoadingProducts(false);
        }
    }

    async function loadOrders() {
        setLoadingOrders(true);
        try {
            const data = await api<any[]>(`/api/orders`);
            const normalized = data.map(normalizeOrder);
            setOrders(normalized);

            // ✅ init drafts from server
            setOrderDrafts((prev) => {
                const next = { ...prev };
                for (const o of normalized) {
                    next[o.id] = {
                        courier: prev[o.id]?.courier ?? (o.courier || ""),
                        tracking: prev[o.id]?.tracking ?? (o.tracking || ""),
                    };
                }
                return next;
            });
        } catch (e: any) {
            toast.error(e?.message || "Failed to load orders");
        } finally {
            setLoadingOrders(false);
        }
    }


    async function loadUsers() {
        setLoadingUsers(true);
        try {
            const data = await api<UserRow[]>(`/api/users`);
            setUsers(data);
        } catch (e: any) {
            toast.error(e?.message || "Failed to load users");
        } finally {
            setLoadingUsers(false);
        }
    }

    // initial loads
    useEffect(() => {
        loadOrders();
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // products reload when search/filter changes (with debounce)
    const searchDebounceRef = useRef<number | null>(null);
    useEffect(() => {
        if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = window.setTimeout(() => {
            loadProducts();
        }, 250);

        return () => {
            if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, statusFilter]);

    // ---- Analytics ----
    const analytics = useMemo(() => {
        const totalProducts = products.length;
        const active = products.filter((p) => p.status === "active").length;
        const lowStock = products.filter((p) => p.stocks <= 10).length;

        const totalOrders = orders.length;
        const pending = orders.filter((o) => o.status === "pending").length;
        const revenue = orders.reduce((sum, o) => sum + o.total, 0);

        const totalUsers = users.length;

        return { totalProducts, active, lowStock, totalOrders, pending, revenue, totalUsers };
    }, [products, orders, users]);

    // ---- Products actions ----
    async function saveProduct() {
        const name = pName.trim();
        if (!name) {
            toast.error("Product name is required");
            return;
        }

        const payload = {
            name,
            description: pDesc.trim(),
            price: Number(pPrice) || 0,
            stocks: Number(pStocks) || 0,
            status: pStatus,
            coverImage: coverUrl || "",
            variants: pVariants.map((v) => ({
                // backend stores variants without needing client-side id
                name: v.name.trim() || "Variant",
                extraPrice: Number(v.extraPrice) || 0,
                sku: (v.sku || "").trim(),
                images: (v.images || []).filter(Boolean),
            })),
        };

        const isEdit = !!editId;
        const t = toast.loading(isEdit ? "Saving changes..." : "Creating product...");

        try {
            if (isEdit) {
                await api(`/api/products/${editId}`, { method: "PATCH", body: JSON.stringify(payload) });
                toast.success("Product updated ✅", { id: t });
            } else {
                await api(`/api/products`, { method: "POST", body: JSON.stringify(payload) });
                toast.success("Product created ✅", { id: t });
            }

            setFormOpen(false);
            resetForm();
            await loadProducts();
        } catch (e: any) {
            toast.error(e?.message || (isEdit ? "Failed to update product" : "Failed to create product"), { id: t });
        }
    }

    function openEdit(p: Product) {
        setEditId(p.id);
        setPName(p.name);
        setPDesc(p.description || "");
        setPPrice(p.price);
        setPStocks(p.stocks);
        setPStatus(p.status);
        setCoverUrl(p.coverImage || "");
        setPVariants(
            (p.variants?.length ? p.variants : [{ id: crypto.randomUUID(), name: "Standard", extraPrice: 0, sku: "", images: [""] }])
                .map((v) => ({
                    id: v.id || crypto.randomUUID(),
                    name: v.name || "Variant",
                    extraPrice: Number(v.extraPrice || 0),
                    sku: v.sku || "",
                    images: Array.isArray(v.images) && v.images.length ? v.images : [""],
                }))
        );
        setFormOpen(true);
    }

    function openDelete(p: Product) {
        setDeleteTarget({ id: p.id, name: p.name });
        setDeleteOpen(true);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;

        const t = toast.loading("Deleting product...");
        setDeleting(true);

        try {
            await api(`/api/products/${deleteTarget.id}`, { method: "DELETE" });
            toast.success("Product deleted ✅", { id: t });

            setDeleteOpen(false);
            setDeleteTarget(null);

            await loadProducts();
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete product", { id: t });
        } finally {
            setDeleting(false);
        }
    }




    // stocks PATCH debounce per product
    const stocksTimersRef = useRef<Record<string, number>>({});
    async function updateStocks(productId: string, nextStocks: number) {
        const safe = Math.max(0, Math.floor(nextStocks));

        // optimistic UI
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stocks: safe } : p)));

        // debounce PATCH per product
        if (stocksTimersRef.current[productId]) {
            window.clearTimeout(stocksTimersRef.current[productId]);
        }

        stocksTimersRef.current[productId] = window.setTimeout(async () => {
            try {
                await api(`/api/products/${productId}`, {
                    method: "PATCH",
                    body: JSON.stringify({ stocks: safe }),
                });
                toast.success("Stocks updated");
            } catch (e: any) {
                toast.error(e?.message || "Failed to update stocks");
                // reload to restore truth
                loadProducts();
            }
        }, 500);
    }

    // ---- Orders actions ----
    async function approveOrder(orderId: string) {
        const t = toast.loading("Approving order...");
        try {
            await api(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) });
            toast.success("Order approved ✅", { id: t });
            await loadOrders();
            await loadProducts(); // reflect auto-deduct if your backend does it
            await loadUsers();
        } catch (e: any) {
            toast.error(e?.message || "Failed to approve order", { id: t });
        }
    }

    async function saveOrderLogistics(orderId: string) {
        const draft = orderDrafts[orderId] || { courier: "", tracking: "" };

        const patch = {
            courier: (draft.courier || "").trim(),
            tracking: (draft.tracking || "").trim(),
        };

        setSavingOrders((m) => ({ ...m, [orderId]: true }));
        const t = toast.loading("Saving logistics...");

        try {
            await api(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(patch) });

            // ✅ update UI truth
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
            toast.success("Saved ✅", { id: t });
        } catch (e: any) {
            toast.error(e?.message || "Failed to save", { id: t });
        } finally {
            setSavingOrders((m) => ({ ...m, [orderId]: false }));
        }
    }


    async function updateOrderField(orderId: string, patch: Partial<Order>) {
        // optimistic UI
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));

        try {
            await api(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify(patch) });
            toast.success("Order updated");
            await loadOrders();
            await loadUsers();
        } catch (e: any) {
            toast.error(e?.message || "Failed to update order");
            loadOrders();
        }
    }

    // ---- for table-only rendering (we already filter server-side) ----
    const filteredProducts = products;

    // ---- Image uploads ----
    async function onPickCover(file?: File | null) {
        if (!file) return;

        const t = toast.loading("Uploading cover...");
        setCoverUploading(true);
        try {
            const out = await uploadImage(file, "products/covers");
            setCoverUrl(out.url);
            toast.success("Cover uploaded ✅", { id: t });
        } catch (e: any) {
            toast.error(e?.message || "Cover upload failed", { id: t });
        } finally {
            setCoverUploading(false);
        }
    }

    async function onPickVariantImage(variantId: string, index: number, file?: File | null) {
        if (!file) return;

        const t = toast.loading("Uploading variant image...");
        setVariantUploading((m) => ({ ...m, [variantId]: true }));
        try {
            const out = await uploadImage(file, `products/variants/${variantId}`);
            setPVariants((prev) =>
                prev.map((v) => {
                    if (v.id !== variantId) return v;
                    const images = [...(v.images || [])];
                    images[index] = out.url; // ✅ replace slot with URL
                    return { ...v, images };
                })
            );
            toast.success("Variant image uploaded ✅", { id: t });
        } catch (e: any) {
            toast.error(e?.message || "Variant upload failed", { id: t });
        } finally {
            setVariantUploading((m) => ({ ...m, [variantId]: false }));
        }
    }

    // ---- Subscriptions data ----
    const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);
    const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [savingPlans, setSavingPlans] = useState(false);

    function daysLeftFromIso(endsAt: string) {
        const end = new Date(endsAt).getTime();
        const now = Date.now();
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return Number.isFinite(diff) ? Math.max(0, diff) : 0;
    }

    async function loadSubscriptions() {
        setLoadingSubs(true);
        try {
            const p = await api<SubscriptionPlan[]>(`/api/subscriptions/plans`);
            const s = await api<any[]>(`/api/subscriptions/subscribers`);

            const normalizedPlans: SubscriptionPlan[] = (p || []).map((x: any) => ({
                key: x.key,
                name: x.name,
                currency: x.currency || "PHP",
                monthly: Number(x.prices?.monthly ?? x.monthly ?? 0),
                annual: Number(x.prices?.annual ?? x.annual ?? 0),
                updatedAt: isoDate(x.updatedAt),
            }));

            setPlans(mergePlans(normalizedPlans));


            setSubscribers((s || []).map((u: any) => ({
                id: u.id ?? u._id,
                name: u.name ?? "—",
                email: u.email ?? "—",
                tier: u.subscription?.tier ?? "deluxe",
                billingCycle: u.subscription?.billingCycle ?? "monthly",
                status: u.subscription?.status ?? "active",
                endsAt: u.subscription?.endsAt ?? new Date().toISOString(),
                daysLeft: Number(u.daysLeft ?? daysLeftFromIso(u.subscription?.endsAt)),
            })));
        } catch (e: any) {
            toast.error(e?.message || "Failed to load subscriptions");
        } finally {
            setLoadingSubs(false);
        }
    }

    async function savePlanPrices() {
        setSavingPlans(true);
        const t = toast.loading("Saving pricing...");
        try {
            await api(`/api/subscriptions/plans`, {
                method: "PATCH",
                body: JSON.stringify({ plans }),
            });
            toast.success("Pricing updated ✅", { id: t });
            await loadSubscriptions();
        } catch (e: any) {
            toast.error(e?.message || "Failed to save pricing", { id: t });
        } finally {
            setSavingPlans(false);
        }
    }

    function clamp(n: number, min: number, max: number) {
        return Math.max(min, Math.min(max, n));
    }
    function roundPeso(n: number) {
        // peso-friendly rounding; change to Math.ceil if you want
        return Math.round(n);
    }

    function computeAnnual(monthly: number, discountPct: number) {
        const base = Number(monthly || 0) * 12;
        const pct = clamp(Number(discountPct || 0), 0, 100);
        const out = base * (1 - pct / 100);
        return roundPeso(out);
    }

    function applyAutoAnnual(p: SubscriptionPlan): SubscriptionPlan {
        const auto = p.autoAnnual ?? true;
        if (!auto) return p;
        return {
            ...p,
            annual: computeAnnual(p.monthly, p.annualDiscountPct ?? 0),
        };
    }


    useEffect(() => {
        if (tab === "subscriptions") loadSubscriptions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);


    return (
        <div className="space-y-5">
            {/* Header Card */}
            <SectionCard>
                <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-[color:var(--foreground)]">Admin Dashboard</h1>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">
                            Welcome, <span className="text-[color:var(--foreground)] font-medium">{user.name}</span>. Admin access
                            verified by email.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Pill>DB connected</Pill>
                        <Pill>{loadingProducts || loadingOrders || loadingUsers ? "Syncing..." : "Synced"}</Pill>
                    </div>
                </div>

                <div className="my-6 h-px w-full bg-[color:var(--border)]" />

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setTab("products")}
                        className={clsx(
                            "rounded-full px-4 py-2 text-sm font-medium border transition",
                            tab === "products"
                                ? "border-transparent bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                                : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90"
                        )}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Package size={16} /> Products
                        </span>
                    </button>

                    <button
                        onClick={() => setTab("orders")}
                        className={clsx(
                            "rounded-full px-4 py-2 text-sm font-medium border transition",
                            tab === "orders"
                                ? "border-transparent bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                                : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90"
                        )}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Truck size={16} /> Orders
                        </span>
                    </button>

                    <button
                        onClick={() => setTab("users")}
                        className={clsx(
                            "rounded-full px-4 py-2 text-sm font-medium border transition",
                            tab === "users"
                                ? "border-transparent bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                                : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90"
                        )}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Users size={16} /> Users
                        </span>
                    </button>

                    <button
                        onClick={() => setTab("subscriptions")}
                        className={clsx(
                            "rounded-full px-4 py-2 text-sm font-medium border transition",
                            tab === "subscriptions"
                                ? "border-transparent bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)]"
                                : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90"
                        )}
                    >
                        <span className="inline-flex items-center gap-2">
                            <BadgeCheck size={16} /> Subscriptions
                        </span>
                    </button>

                </div>
            </SectionCard>

            {/* Analytics row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SoftCard>
                    <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Revenue</p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{money(analytics.revenue)}</p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">From orders collection</p>
                </SoftCard>

                <SoftCard>
                    <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Orders</p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{analytics.totalOrders}</p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">{analytics.pending} pending approval</p>
                </SoftCard>

                <SoftCard>
                    <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Products</p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{analytics.totalProducts}</p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">
                        {analytics.active} active · {analytics.lowStock} low stock
                    </p>
                </SoftCard>

                <SoftCard>
                    <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Users</p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{analytics.totalUsers}</p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">Computed /users endpoint</p>
                </SoftCard>
            </div>

            {/* ✅ PRODUCTS TAB */}
            {tab === "products" && (
                <>
                    <SectionCard>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Products</h2>
                                <p className="mt-1 text-xs text-[color:var(--muted)]">Add/edit products, variants, and stock.</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <SmallButton variant="soft" onClick={() => loadProducts()}>
                                    Refresh
                                </SmallButton>
                                <SmallButton variant="primary" onClick={() => setFormOpen(true)}>
                                    <Plus size={16} />
                                    Add product
                                </SmallButton>
                            </div>
                        </div>

                        <div className="my-5 h-px w-full bg-[color:var(--border)]" />

                        <div className="grid gap-2 sm:grid-cols-[1fr_260px]">
                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70" />
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search products, variants, SKU..."
                                    className="pl-10"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-full">
                                    <Select
                                        value={statusFilter}
                                        onChange={(v) => setStatusFilter(v as any)}
                                        options={[
                                            { value: "all", label: "All statuses" },
                                            { value: "active", label: "Active only" },
                                            { value: "draft", label: "Draft only" },
                                        ]}
                                    />
                                </div>

                                <div
                                    className="
                    h-[46px] w-[46px]
                    rounded-2xl
                    border border-[color:var(--border)]
                    bg-[color:var(--soft-bg)]
                    grid place-items-center
                    opacity-80
                  "
                                    title="More filters coming"
                                >
                                    <SlidersHorizontal size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] overflow-hidden">
                            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: "touch" }}>
                                <div className="min-w-[980px]">
                                    <div
                                        className={clsx(
                                            "grid items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-[color:var(--muted)]",
                                            COL_PRODUCTS
                                        )}
                                    >
                                        <div>Product</div>
                                        <div>Variants</div>
                                        <div>Status</div>
                                        <div>Stocks</div>
                                        <div className="text-right">Price</div>
                                        <div className="text-right">Actions</div>
                                    </div>

                                    <div className="h-px w-full bg-[color:var(--border)]" />

                                    <div className="divide-y divide-[color:var(--border)]">
                                        {loadingProducts && (
                                            <div className="px-4 py-6 text-sm text-[color:var(--muted)]">Loading products…</div>
                                        )}

                                        {!loadingProducts &&
                                            filteredProducts.map((p) => (
                                                <div key={p.id} className={clsx("grid items-center gap-3 px-4 py-4", COL_PRODUCTS)}>
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center flex-none">
                                                            {p.coverImage ? (
                                                                <Image src={p.coverImage} alt={p.name} fill className="object-cover" />
                                                            ) : (
                                                                <ImageIcon size={18} className="opacity-70" />
                                                            )}
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">{p.name}</p>
                                                            <p className="mt-1 text-xs text-[color:var(--muted)] line-clamp-1">{p.description || "—"}</p>

                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                <Pill>Created: {p.createdAt}</Pill>
                                                                {p.stocks <= 10 ? <Pill>Low stock</Pill> : null}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-[color:var(--foreground)]">
                                                        <p className="font-medium">{p.variants.length}</p>
                                                        <p className="mt-1 text-xs text-[color:var(--muted)] line-clamp-2">
                                                            {p.variants.map((v) => v.name).join(" · ")}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-start">
                                                        <span
                                                            className={clsx(
                                                                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border",
                                                                p.status === "active"
                                                                    ? "border-green-500/30 bg-green-500/10 text-[color:var(--foreground)]"
                                                                    : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                                            )}
                                                        >
                                                            {p.status === "active" ? <BadgeCheck size={14} /> : <PencilLine size={14} />}
                                                            {p.status}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            value={p.stocks}
                                                            onChange={(e) => updateStocks(p.id, Number(e.target.value))}
                                                            min={0}
                                                        />
                                                    </div>

                                                    <div className="text-right">
                                                        <p className="text-sm text-[color:var(--foreground)] font-semibold">{money(p.price)}</p>
                                                        <p className="mt-1 text-xs text-[color:var(--muted)] font-normal">Base</p>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-2">
                                                        <SmallButton variant="soft" onClick={() => openEdit(p)}>
                                                            <PencilLine size={16} />
                                                        </SmallButton>
                                                        <SmallButton variant="soft" onClick={() => openDelete(p)}>
                                                            <Trash2 size={16} />
                                                        </SmallButton>
                                                    </div>

                                                </div>
                                            ))}

                                        {!loadingProducts && filteredProducts.length === 0 && (
                                            <div className="px-4 py-10 text-center">
                                                <p className="text-sm font-medium text-[color:var(--foreground)]">No results</p>
                                                <p className="mt-1 text-xs text-[color:var(--muted)]">Try a different search or status filter.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="mt-3 text-[11px] text-[color:var(--muted)]">
                            Tip: Stocks update is debounced (500ms) to reduce API spam.
                        </p>
                    </SectionCard>

                    {/* ✅ ADD PRODUCT MODAL */}
                    {formOpen && (
                        <div
                            className="fixed inset-0 z-[80]"
                            aria-modal="true"
                            role="dialog"
                            onMouseDown={(e) => {
                                if (e.target === e.currentTarget) {
                                    setFormOpen(false);
                                    resetForm();
                                }
                            }}
                        >
                            <div className="absolute inset-0 bg-[color:var(--panel-bg)] backdrop-blur-sm" />

                            <div className="relative mx-auto h-full w-full max-w-3xl px-4 sm:px-6 py-6">
                                <div
                                    className="
                    h-full max-h-[calc(100vh-48px)]
                    rounded-[28px]
                    border border-[color:var(--border)]
                    bg-[color:var(--panel-bg)]
                    shadow-[var(--shadow)]
                    overflow-hidden
                    flex flex-col
                  "
                                >
                                    <div className="px-5 sm:px-6 py-4 border-b border-[color:var(--border)]">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">OPTIMAL CLOTHING</p>
                                                <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                                                    {editId ? "Edit Product" : "Create Product"}
                                                </h3>
                                                <p className="mt-1 text-xs text-[color:var(--muted)]">
                                                    {editId ? "This will PATCH your Express + MongoDB." : "This will POST to your Express + MongoDB."}
                                                </p>

                                            </div>

                                            <div className="flex items-center gap-2">
                                                <SmallButton
                                                    variant="soft"
                                                    onClick={() => {
                                                        setFormOpen(false);
                                                        resetForm();
                                                    }}
                                                >
                                                    Close
                                                </SmallButton>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                saveProduct();
                                            }}
                                            className="space-y-4"
                                        >
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Field label="Product name" hint="Public name">
                                                    <Input
                                                        value={pName}
                                                        onChange={(e) => setPName(e.target.value)}
                                                        placeholder="e.g. Skull + Headphones (B/W)"
                                                    />
                                                </Field>

                                                <Field label="Status" hint="Tap to cycle">
                                                    <Select
                                                        value={pStatus}
                                                        onChange={(v) => setPStatus(v as any)}
                                                        options={[
                                                            { value: "draft", label: "Draft" },
                                                            { value: "active", label: "Active" },
                                                        ]}
                                                    />
                                                </Field>
                                            </div>

                                            <Field label="Description" hint="Short but clear">
                                                <Textarea
                                                    value={pDesc}
                                                    onChange={(e) => setPDesc(e.target.value)}
                                                    placeholder="Describe the design + print notes..."
                                                />
                                            </Field>

                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <Field label="Base price (PHP)">
                                                    <Input type="number" value={pPrice} onChange={(e) => setPPrice(Number(e.target.value))} min={0} />
                                                </Field>

                                                <Field label="Stocks" hint="Manual for now">
                                                    <Input type="number" value={pStocks} onChange={(e) => setPStocks(Number(e.target.value))} min={0} />
                                                </Field>
                                            </div>

                                            <Field label="Cover image" hint="Upload now">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp"
                                                            onChange={(e) => onPickCover(e.target.files?.[0])}
                                                            className="text-sm"
                                                            disabled={coverUploading}
                                                        />
                                                        {coverUploading ? <Pill>Uploading…</Pill> : null}
                                                    </div>

                                                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-3">
                                                        {coverUrl ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-bg)]">
                                                                    <Image src={coverUrl} alt="Cover" fill className="object-cover" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs text-[color:var(--foreground)] font-medium">Uploaded</p>
                                                                    <p className="text-[11px] text-[color:var(--muted)] truncate">{coverUrl}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <ImageIcon size={18} className="opacity-70" />
                                                                <span className="text-[color:var(--muted)] text-sm">No cover uploaded yet</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Field>


                                            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-[color:var(--foreground)]">Variants</p>
                                                        <p className="mt-1 text-xs text-[color:var(--muted)]">Each variant can have its own images.</p>
                                                    </div>
                                                    <SmallButton onClick={addVariant}>
                                                        <Plus size={16} />
                                                        Add variant
                                                    </SmallButton>
                                                </div>

                                                <div className="mt-4 space-y-3">
                                                    {pVariants.map((v, idx) => (
                                                        <div key={v.id} className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <p className="text-sm font-semibold text-[color:var(--foreground)]">Variant {idx + 1}</p>
                                                                <SmallButton variant="ghost" onClick={() => removeVariant(v.id)} disabled={pVariants.length <= 1}>
                                                                    Remove
                                                                </SmallButton>
                                                            </div>

                                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                                <Field label="Variant name">
                                                                    <Input
                                                                        value={v.name}
                                                                        onChange={(e) => setPVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)))}
                                                                    />
                                                                </Field>

                                                                <Field label="Extra price (PHP)" hint="add-on">
                                                                    <Input
                                                                        type="number"
                                                                        value={v.extraPrice}
                                                                        min={0}
                                                                        onChange={(e) => setPVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, extraPrice: Number(e.target.value) } : x)))}
                                                                    />
                                                                </Field>
                                                            </div>

                                                            <div className="mt-3">
                                                                <Field label="SKU (optional)">
                                                                    <Input
                                                                        value={v.sku || ""}
                                                                        onChange={(e) => setPVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, sku: e.target.value } : x)))}
                                                                        placeholder="e.g. SKULL-FRONT"
                                                                    />
                                                                </Field>
                                                            </div>

                                                            <div className="mt-4">
                                                                <div className="flex items-center justify-between">
                                                                    <p className="text-sm font-medium text-[color:var(--foreground)]">Variant images</p>
                                                                    <SmallButton onClick={() => addVariantImage(v.id)}>
                                                                        <Plus size={16} />
                                                                        Add image slot
                                                                    </SmallButton>
                                                                </div>

                                                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                                    {v.images.map((img, i) => (
                                                                        <div
                                                                            key={`${v.id}-${i}`}
                                                                            className="
        rounded-2xl border border-[color:var(--border)]
        bg-[color:var(--card-bg)]
        px-4 py-3
        flex items-center justify-between gap-3
      "
                                                                        >
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                {img ? (
                                                                                    <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--soft-bg)]">
                                                                                        <Image src={img} alt={`Variant ${i + 1}`} fill className="object-cover" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <ImageIcon size={18} className="opacity-70" />
                                                                                )}

                                                                                <div className="min-w-0">
                                                                                    <p className="text-xs text-[color:var(--foreground)] font-medium">
                                                                                        Image {i + 1}
                                                                                    </p>
                                                                                    <p className="text-[11px] text-[color:var(--muted)] truncate">
                                                                                        {img ? "Uploaded" : "Empty slot"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/png,image/jpeg,image/webp"
                                                                                    onChange={(e) => onPickVariantImage(v.id, i, e.target.files?.[0])}
                                                                                    className="text-[11px]"
                                                                                    disabled={!!variantUploading[v.id]}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="px-5 sm:px-6 py-4 border-t border-[color:var(--border)] bg-[color:var(--panel-bg)]">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <p className="text-[11px] text-[color:var(--muted)]">Press “Create product” to save to MongoDB.</p>

                                            <div className="flex items-center gap-2">
                                                <SmallButton onClick={resetForm}>Reset</SmallButton>
                                                <SmallButton variant="primary" onClick={saveProduct}>
                                                    <CheckCircle2 size={16} />
                                                    {editId ? "Save changes" : "Create product"}
                                                </SmallButton>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-6" />
                            </div>
                        </div>
                    )}
                </>
            )}

            {deleteOpen && (
                <div
                    className="fixed inset-0 z-[90]"
                    aria-modal="true"
                    role="dialog"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget && !deleting) {
                            setDeleteOpen(false);
                            setDeleteTarget(null);
                        }
                    }}
                >
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-[color:var(--panel-bg)] backdrop-blur-sm" />

                    <div className="relative mx-auto h-full w-full max-w-lg px-4 sm:px-6 py-10">
                        <div
                            className="
          rounded-[28px]
          border border-[color:var(--border)]
          bg-[color:var(--panel-bg)]
          shadow-[var(--shadow)]
          overflow-hidden
        "
                        >
                            {/* header */}
                            <div className="px-5 sm:px-6 py-4 border-b border-[color:var(--border)]">
                                <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">
                                    OPTIMAL CLOTHING
                                </p>
                                <h3 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">
                                    Delete product
                                </h3>
                                <p className="mt-1 text-xs text-[color:var(--muted)]">
                                    This action is permanent. The product will be removed from the store.
                                </p>
                            </div>

                            {/* body */}
                            <div className="px-5 sm:px-6 py-5 space-y-4">
                                <div
                                    className="
              rounded-2xl border border-red-500/20
              bg-red-500/10 p-4
            "
                                >
                                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                        Are you sure you want to delete:
                                    </p>
                                    <p className="mt-1 text-sm text-[color:var(--foreground)] truncate">
                                        {deleteTarget?.name || "—"}
                                    </p>
                                    <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                                        Tip: If you just want to hide it, set status to <b>draft</b> instead.
                                    </p>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <SmallButton
                                        variant="soft"
                                        onClick={() => {
                                            if (deleting) return;
                                            setDeleteOpen(false);
                                            setDeleteTarget(null);
                                        }}
                                        disabled={deleting}
                                    >
                                        Cancel
                                    </SmallButton>

                                    <SmallButton
                                        variant="primary"
                                        onClick={confirmDelete}
                                        disabled={deleting}
                                    >
                                        <Trash2 size={16} />
                                        {deleting ? "Deleting..." : "Delete now"}
                                    </SmallButton>
                                </div>

                                <p className="text-[11px] text-[color:var(--muted)]">
                                    You can’t undo this. Make sure it’s the correct product.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ✅ ORDERS TAB */}
            {tab === "orders" && (
                <SectionCard>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Orders</h2>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">Approve orders, update logistics, and track status.</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <SmallButton variant="soft" onClick={() => loadOrders()}>
                                Refresh
                            </SmallButton>
                            <Pill>Auto-stock deduction: backend</Pill>
                        </div>
                    </div>

                    <div className="my-5 h-px w-full bg-[color:var(--border)]" />

                    <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)]">
                        <div className="overflow-x-auto overscroll-x-contain">
                            <div className="min-w-[980px]">
                                <div
                                    className={clsx(
                                        "grid gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-[color:var(--muted)]",
                                        COL_ORDERS
                                    )}
                                >
                                    <div>Order</div>
                                    <div>Customer</div>
                                    <div>Status</div>
                                    <div>Logistics</div>
                                    <div>Actions</div>
                                </div>

                                <div className="h-px w-full bg-[color:var(--border)]" />

                                <div className="divide-y divide-[color:var(--border)]">
                                    {loadingOrders && <div className="px-4 py-6 text-sm text-[color:var(--muted)]">Loading orders…</div>}

                                    {!loadingOrders &&
                                        orders.map((o) => (
                                            <div key={o.id} className={clsx("grid gap-3 px-4 py-4", COL_ORDERS)}>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[color:var(--foreground)]">{o.id}</p>
                                                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                                                        {o.items
                                                            .map((it) => `${it.qty}× ${it.productName}${it.variantName ? ` (${it.variantName})` : ""}`)
                                                            .join(" · ")}
                                                    </p>
                                                    <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">{money(o.total)}</p>
                                                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">Updated: {o.updatedAt}</p>
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-[color:var(--foreground)] truncate">{o.customerName}</p>
                                                    <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{o.customerEmail}</p>
                                                </div>

                                                <div className="flex items-start">
                                                    <span
                                                        className={clsx(
                                                            "inline-flex items-center rounded-full px-3 py-1 text-xs border",
                                                            o.status === "pending"
                                                                ? "border-yellow-500/30 bg-yellow-500/10 text-[color:var(--foreground)]"
                                                                : o.status === "approved"
                                                                    ? "border-blue-500/30 bg-blue-500/10 text-[color:var(--foreground)]"
                                                                    : o.status === "shipped"
                                                                        ? "border-purple-500/30 bg-purple-500/10 text-[color:var(--foreground)]"
                                                                        : o.status === "delivered"
                                                                            ? "border-green-500/30 bg-green-500/10 text-[color:var(--foreground)]"
                                                                            : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                                        )}
                                                    >
                                                        {o.status}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    <Input
                                                        value={orderDrafts[o.id]?.courier ?? (o.courier || "")}
                                                        onChange={(e) =>
                                                            setOrderDrafts((prev) => ({
                                                                ...prev,
                                                                [o.id]: { courier: e.target.value, tracking: prev[o.id]?.tracking ?? (o.tracking || "") },
                                                            }))
                                                        }
                                                        placeholder="Courier (e.g. J&T)"
                                                    />

                                                    <Input
                                                        value={orderDrafts[o.id]?.tracking ?? (o.tracking || "")}
                                                        onChange={(e) =>
                                                            setOrderDrafts((prev) => ({
                                                                ...prev,
                                                                [o.id]: { courier: prev[o.id]?.courier ?? (o.courier || ""), tracking: e.target.value },
                                                            }))
                                                        }
                                                        placeholder="Tracking number"
                                                    />

                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[11px] text-[color:var(--muted)]">
                                                            Not saved yet (click Save)
                                                        </p>

                                                        <SmallButton
                                                            variant="primary"
                                                            onClick={() => saveOrderLogistics(o.id)}
                                                            disabled={!!savingOrders[o.id]}
                                                        >
                                                            {savingOrders[o.id] ? "Saving..." : "Save"}
                                                        </SmallButton>
                                                    </div>
                                                </div>


                                                <div className="flex flex-col gap-2">
                                                    {o.status === "pending" ? (
                                                        <SmallButton variant="primary" onClick={() => approveOrder(o.id)}>
                                                            <BadgeCheck size={16} />
                                                            Approve
                                                        </SmallButton>
                                                    ) : (
                                                        <SmallButton variant="soft" onClick={() => updateOrderField(o.id, { status: "shipped" })}>
                                                            <Truck size={16} />
                                                            Mark shipped
                                                        </SmallButton>
                                                    )}

                                                    <SmallButton variant="soft" onClick={() => updateOrderField(o.id, { status: "delivered" })}>
                                                        <CheckCircle2 size={16} />
                                                        Mark delivered
                                                    </SmallButton>
                                                </div>
                                            </div>
                                        ))}

                                    {!loadingOrders && orders.length === 0 && (
                                        <div className="px-4 py-10 text-center">
                                            <p className="text-sm font-medium text-[color:var(--foreground)]">No orders yet</p>
                                            <p className="mt-1 text-xs text-[color:var(--muted)]">Once customers checkout, orders will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* ✅ USERS TAB */}
            {tab === "users" && (
                <SectionCard>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Users monitoring</h2>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">Computed from orders (for now).</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <SmallButton variant="soft" onClick={() => loadUsers()}>
                                Refresh
                            </SmallButton>
                            <Pill>Admin-only</Pill>
                        </div>
                    </div>

                    <div className="my-5 h-px w-full bg-[color:var(--border)]" />

                    <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)]">
                        <div className="overflow-x-auto overscroll-x-contain">
                            <div className="min-w-[760px]">
                                <div
                                    className={clsx(
                                        "grid gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-[color:var(--muted)]",
                                        COL_USERS
                                    )}
                                >
                                    <div>User</div>
                                    <div>Orders</div>
                                    <div>Spent</div>
                                    <div>Joined</div>
                                </div>

                                <div className="h-px w-full bg-[color:var(--border)]" />

                                <div className="divide-y divide-[color:var(--border)]">
                                    {loadingUsers && <div className="px-4 py-6 text-sm text-[color:var(--muted)]">Loading users…</div>}

                                    {!loadingUsers &&
                                        users.map((u) => (
                                            <div key={u.id} className={clsx("grid gap-3 px-4 py-4", COL_USERS)}>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">{u.name}</p>
                                                    <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{u.email}</p>
                                                </div>
                                                <div className="text-sm text-[color:var(--foreground)] font-medium">{u.orders}</div>
                                                <div className="text-sm text-[color:var(--foreground)] font-medium">{money(u.spent)}</div>
                                                <div className="text-sm text-[color:var(--muted)]">{u.joinedAt}</div>
                                            </div>
                                        ))}

                                    {!loadingUsers && users.length === 0 && (
                                        <div className="px-4 py-10 text-center">
                                            <p className="text-sm font-medium text-[color:var(--foreground)]">No users found</p>
                                            <p className="mt-1 text-xs text-[color:var(--muted)]">This uses /api/users computed endpoint.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            )}

            {tab === "subscriptions" && (
                <SectionCard>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Subscriptions</h2>
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                                Edit plan pricing + view active subscribers (cycle + days left).
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <SmallButton variant="soft" onClick={loadSubscriptions} disabled={loadingSubs}>
                                Refresh
                            </SmallButton>
                            <SmallButton variant="primary" onClick={savePlanPrices} disabled={savingPlans || loadingSubs} >
                                {savingPlans ? "Saving..." : "Save pricing"}
                            </SmallButton>
                        </div>
                    </div>

                    <div className="my-5 h-px w-full bg-[color:var(--border)]" />

                    {/* Pricing controls */}
                    <div className="grid gap-4 lg:grid-cols-3">
                        {plans.map((p) => {
                            const isBest = p.key === "grand";
                            const isVip = p.key === "royalty";
                            return (
                                <div
                                    key={p.key}
                                    className={clsx(
                                        "relative rounded-[28px] border bg-[color:var(--card-bg)] shadow-[var(--shadow)] overflow-hidden p-5",
                                        isBest ? "border-red-500/30" : isVip ? "border-amber-500/30" : "border-[color:var(--border)]"
                                    )}
                                >
                                    <div
                                        className={clsx(
                                            "pointer-events-none absolute -inset-24 rotate-12 opacity-70",
                                            isBest
                                                ? "bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.22),transparent_60%)]"
                                                : isVip
                                                    ? "bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.18),transparent_60%)]"
                                                    : "bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.12),transparent_60%)]"
                                        )}
                                    />

                                    <div className="relative">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs tracking-[0.35em] text-[color:var(--muted)] uppercase">Plan</p>
                                                <p className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">{p.name}</p>
                                                <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                                                    Key: {p.key} {p.updatedAt ? `• Updated: ${p.updatedAt}` : ""}
                                                </p>
                                            </div>

                                            {isBest ? <Pill>BEST VALUE</Pill> : isVip ? <Pill>VIP</Pill> : <Pill>BASE</Pill>}
                                        </div>

                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <p className="text-sm font-medium text-[color:var(--foreground)]">Auto compute annual</p>

                                            <SmallButton
                                                variant={(p.autoAnnual ?? true) ? "primary" : "soft"}
                                                onClick={() => {
                                                    setPlans(prev =>
                                                        prev.map(x => {
                                                            if (x.key !== p.key) return x;
                                                            const next = { ...x, autoAnnual: !(x.autoAnnual ?? true) };
                                                            return applyAutoAnnual(next);
                                                        })
                                                    );
                                                }}
                                            >
                                                {(p.autoAnnual ?? true) ? "ON" : "OFF"}
                                            </SmallButton>
                                        </div>


                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <Field label="Monthly (PHP)" hint="Shown on /subscriptions">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={p.monthly}
                                                    onChange={(e) => {
                                                        const v = Math.max(0, Number(e.target.value));
                                                        setPlans(prev =>
                                                            prev.map(x => {
                                                                if (x.key !== p.key) return x;
                                                                const next = { ...x, monthly: v };
                                                                return applyAutoAnnual(next);
                                                            })
                                                        );
                                                    }}
                                                />
                                            </Field>

                                            <Field label="Annual (PHP)" hint="Shown on /subscriptions">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={p.annual}
                                                    disabled={p.autoAnnual ?? true}
                                                    onChange={(e) => {
                                                        const v = Math.max(0, Number(e.target.value));
                                                        setPlans(prev => prev.map(x => (x.key === p.key ? { ...x, annual: v } : x)));
                                                    }}
                                                />
                                                <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                                                    {(p.autoAnnual ?? true) ? "Auto computed from monthly + discount" : "Manual annual pricing"}
                                                </p>
                                            </Field>
                                        </div>

                                        <div className="mt-4">
                                            <Field label="Annual discount (%)" hint="0–100">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={p.annualDiscountPct ?? 0}
                                                    onChange={(e) => {
                                                        const pct = clamp(Number(e.target.value), 0, 100);
                                                        setPlans(prev =>
                                                            prev.map(x => {
                                                                if (x.key !== p.key) return x;
                                                                const next = { ...x, annualDiscountPct: pct };
                                                                return applyAutoAnnual(next);
                                                            })
                                                        );
                                                    }}
                                                />
                                            </Field>

                                        </div>

                                        <p className="mt-3 text-[11px] text-[color:var(--muted)]">
                                            Note: “discount %” and compute annual price automatically will be added later.
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {loadingSubs && plans.length === 0 ? (
                            <div className="lg:col-span-3 text-sm text-[color:var(--muted)]">Loading pricing…</div>
                        ) : null}
                    </div>

                    {/* Subscribers table */}
                    <div className="mt-6 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] overflow-hidden">
                        <div className="w-full max-w-full overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: "touch" }}>
                            <div className="min-w-[980px]">
                                <div className="grid gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-[color:var(--muted)]
            grid-cols-[minmax(260px,1fr)_minmax(160px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.6fr)]">
                                    <div>User</div>
                                    <div>Tier</div>
                                    <div>Cycle</div>
                                    <div>Status</div>
                                    <div className="text-right">Days left</div>
                                </div>

                                <div className="h-px w-full bg-[color:var(--border)]" />

                                <div className="divide-y divide-[color:var(--border)]">
                                    {loadingSubs && (
                                        <div className="px-4 py-6 text-sm text-[color:var(--muted)]">Loading subscribers…</div>
                                    )}

                                    {!loadingSubs &&
                                        subscribers.map((u) => (
                                            <div
                                                key={u.id}
                                                className="grid gap-3 px-4 py-4
                    grid-cols-[minmax(260px,1fr)_minmax(160px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)_minmax(140px,0.6fr)]"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[color:var(--foreground)] truncate">{u.name}</p>
                                                    <p className="mt-1 text-xs text-[color:var(--muted)] truncate">{u.email}</p>
                                                </div>

                                                <div className="text-sm text-[color:var(--foreground)] font-medium capitalize">{u.tier}</div>
                                                <div className="text-sm text-[color:var(--foreground)] font-medium">{u.billingCycle}</div>

                                                <div className="flex items-start">
                                                    <span
                                                        className={clsx(
                                                            "inline-flex items-center rounded-full px-3 py-1 text-xs border",
                                                            u.status === "active"
                                                                ? "border-green-500/30 bg-green-500/10 text-[color:var(--foreground)]"
                                                                : u.status === "expired"
                                                                    ? "border-yellow-500/30 bg-yellow-500/10 text-[color:var(--foreground)]"
                                                                    : "border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--muted)]"
                                                        )}
                                                    >
                                                        {u.status}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-[color:var(--foreground)]">{u.daysLeft}</p>
                                                    <p className="mt-1 text-[11px] text-[color:var(--muted)]">{isoDate(u.endsAt)}</p>
                                                </div>
                                            </div>
                                        ))}

                                    {!loadingSubs && subscribers.length === 0 && (
                                        <div className="px-4 py-10 text-center">
                                            <p className="text-sm font-medium text-[color:var(--foreground)]">No subscribers yet</p>
                                            <p className="mt-1 text-xs text-[color:var(--muted)]">Once we wire checkout, subscribers will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            )}

        </div>
    );
}
