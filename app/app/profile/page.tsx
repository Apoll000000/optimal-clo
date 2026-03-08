"use client";

import AppTopBar from "@/components/nav/AppTopBar";
import { useAuth } from "@/services/auth";
import { getCart } from "@/services/cart";
import { getMyOrders, Order } from "@/services/orders";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    User as UserIcon,
    ShoppingBag,
    Package,
    PencilLine,
    Save,
    X,
    Camera,
    Mail,
} from "lucide-react";

function clsx(...a: Array<string | false | undefined>) {
    return a.filter(Boolean).join(" ");
}

const CART_EVENT = "optimal:cart-updated";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function updateMyProfile(input: { name: string; avatarFile?: File | null }) {
    const fd = new FormData();
    fd.append("name", input.name);
    if (input.avatarFile) fd.append("avatar", input.avatarFile);

    const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",
        body: fd,
        credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to update profile");
    return data.user as { id: string; email: string; name: string; avatar?: string };
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

function SoftCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            className="rounded-2xl border border-[color:var(--border)]
      bg-[color:var(--card-bg)] p-5"
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
    variant?: "soft" | "primary" | "ghost" | "danger";
    disabled?: boolean;
}) {
    const base =
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition";
    const soft =
        "border border-[color:var(--border)] bg-[color:var(--soft-bg)] text-[color:var(--foreground)] hover:opacity-90";
    const primary =
        "bg-[color:var(--btn-primary-bg)] text-[color:var(--btn-primary-fg)] hover:opacity-90";
    const ghost =
        "text-[color:var(--foreground)] hover:bg-[color:var(--soft-bg)]";
    const danger =
        "border border-red-500/30 bg-red-500/10 text-[color:var(--foreground)] hover:opacity-90";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={clsx(
                base,
                variant === "primary"
                    ? primary
                    : variant === "ghost"
                        ? ghost
                        : variant === "danger"
                            ? danger
                            : soft,
                disabled && "opacity-60 cursor-not-allowed"
            )}
        >
            {children}
        </button>
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

export default function ProfilePage() {
    // if your useAuth has refreshMe, we’ll use it; else fallback
    const auth = useAuth() as any;
    const { user, loading, refresh, logout } = auth;
    const refreshMe: undefined | (() => Promise<void>) = auth?.refreshMe;

    const router = useRouter();

    const [cartCount, setCartCount] = useState(0);

    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    // inline edit
    const [editing, setEditing] = useState(false);
    const [nameDraft, setNameDraft] = useState("");
    const [saving, setSaving] = useState(false);

    // avatar upload
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);

    // protect
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=/profile");
    }, [loading, user, router]);

    async function refreshCartCount() {
        try {
            const items = await getCart();
            setCartCount(items.reduce((s, it) => s + (it.qty || 0), 0));
        } catch {
            // ignore
        }
    }

    async function loadStats() {
        if (!user?.email) return;

        setLoadingStats(true);
        try {
            const data = await getMyOrders(user.email);
            setOrders(data);
        } catch (e: any) {
            toast.error(e?.message || "Failed to load stats");
        } finally {
            setLoadingStats(false);
        }
    }

    useEffect(() => {
        if (!user) return;
        setNameDraft(user.name || "");
        loadStats();
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
    }, [user]);

    const stats = useMemo(() => {
        const totalOrders = orders.length;
        const activeOrders = orders.filter(
            (o) => o.status !== "delivered" && o.status !== "cancelled"
        ).length;
        const completedOrders = orders.filter((o) => o.status === "delivered").length;
        const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

        return { totalOrders, activeOrders, completedOrders, cancelledOrders };
    }, [orders]);

    function onPickAvatar(file?: File | null) {
        if (!file) return;

        // optional: simple file size guard
        if (file.size > 6 * 1024 * 1024) {
            toast.error("Max 6MB image only");
            return;
        }

        const url = URL.createObjectURL(file);
        setAvatarPreview(url);
        setAvatarFile(file);
        toast.success("Profile photo ready ✅");
    }

    async function saveProfile() {
        const next = nameDraft.trim();
        if (!next) {
            toast.error("Name cannot be empty");
            return;
        }

        setSaving(true);
        const t = toast.loading("Saving profile...");
        try {
            await updateMyProfile({ name: next, avatarFile });

            toast.success("Saved ✅", { id: t });

            setEditing(false);
            setAvatarFile(null);
            setAvatarPreview(""); // ✅ para yung saved avatar from backend ang makita

            await refresh(); // ✅ eto yung maguupdate agad UI (name + avatar)


            // if your auth supports refreshing user, call it
            if (refreshMe) {
                await refreshMe();
            } else {
                // fallback
                router.refresh?.();
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to save profile", { id: t });
        } finally {
            setSaving(false);
        }
    }

    if (loading) return null;
    if (!user) return null;

    const shownAvatar = avatarPreview || user.avatar || "";

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

            <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-10 space-y-5">
                {/* Header */}
                <SectionCard>
                    <p className="text-xs tracking-[0.35em] text-[color:var(--muted)]">ACCOUNT</p>

                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-[color:var(--foreground)]">
                                Profile
                            </h1>
                            <p className="mt-2 text-sm text-[color:var(--muted)] max-w-2xl">
                                Manage your account details and quickly jump to your orders and cart.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Pill>{loadingStats ? "Syncing..." : "Synced"}</Pill>
                            <SmallButton variant="soft" onClick={loadStats} disabled={loadingStats}>
                                Refresh stats
                            </SmallButton>
                        </div>
                    </div>
                </SectionCard>

                {/* Stats row */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <button onClick={() => router.push("/orders")} className="text-left" type="button">
                        <SoftCard>
                            <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Orders</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                                {loadingStats ? "—" : stats.totalOrders}
                            </p>
                            <p className="mt-2 text-xs text-[color:var(--muted)] inline-flex items-center gap-2">
                                <Package size={14} /> View all orders
                            </p>
                        </SoftCard>
                    </button>

                    <button onClick={() => router.push("/orders")} className="text-left" type="button">
                        <SoftCard>
                            <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Active</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                                {loadingStats ? "—" : stats.activeOrders}
                            </p>
                            <p className="mt-2 text-xs text-[color:var(--muted)]">Pending / processing</p>
                        </SoftCard>
                    </button>

                    <button onClick={() => router.push("/orders")} className="text-left" type="button">
                        <SoftCard>
                            <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Completed</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                                {loadingStats ? "—" : stats.completedOrders}
                            </p>
                            <p className="mt-2 text-xs text-[color:var(--muted)]">Delivered</p>
                        </SoftCard>
                    </button>

                    <button onClick={() => router.push("/cart")} className="text-left" type="button">
                        <SoftCard>
                            <p className="text-xs text-[color:var(--muted)] tracking-[0.22em] uppercase">Cart</p>
                            <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">{cartCount}</p>
                            <p className="mt-2 text-xs text-[color:var(--muted)] inline-flex items-center gap-2">
                                <ShoppingBag size={14} /> Open cart
                            </p>
                        </SoftCard>
                    </button>
                </div>

                {/* Main grid */}
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    {/* Left: Profile details */}
                    <SectionCard>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">YOUR DETAILS</p>
                                <h2 className="mt-2 text-xl font-semibold text-[color:var(--foreground)]">Account info</h2>
                                <p className="mt-1 text-xs text-[color:var(--muted)]">
                                    You can edit your name and profile photo. Email is locked.
                                </p>
                            </div>

                            {!editing ? (
                                <SmallButton variant="soft" onClick={() => setEditing(true)}>
                                    <PencilLine size={16} />
                                    Edit
                                </SmallButton>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <SmallButton
                                        variant="ghost"
                                        onClick={() => {
                                            if (saving) return;
                                            setEditing(false);
                                            setNameDraft(user.name || "");
                                            setAvatarPreview("");
                                            setAvatarFile(null);
                                        }}
                                        disabled={saving}
                                    >
                                        <X size={16} />
                                        Cancel
                                    </SmallButton>
                                    <SmallButton variant="primary" onClick={saveProfile} disabled={saving}>
                                        <Save size={16} />
                                        {saving ? "Saving..." : "Save"}
                                    </SmallButton>
                                </div>
                            )}
                        </div>

                        <div className="my-5 h-px w-full bg-[color:var(--border)]" />

                        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                            {/* Avatar */}
                            <div className="flex flex-col items-start gap-2">
                                <div className="relative h-[110px] w-[110px] overflow-hidden rounded-[26px] border border-[color:var(--border)] bg-[color:var(--soft-bg)] grid place-items-center">
                                    {shownAvatar ? (
                                        <Image src={shownAvatar} alt="Profile" fill className="object-cover" />
                                    ) : (
                                        <UserIcon size={28} className="opacity-70" />
                                    )}
                                </div>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => onPickAvatar(e.target.files?.[0])}
                                />

                                <SmallButton variant="soft" onClick={() => fileRef.current?.click()} disabled={!editing}>
                                    <Camera size={16} />
                                    Change
                                </SmallButton>

                                {!editing ? <Pill>Tap Edit to update</Pill> : avatarFile ? <Pill>Ready to upload</Pill> : null}
                            </div>

                            {/* Fields */}
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-[color:var(--muted)]">Name</p>
                                    {editing ? (
                                        <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Your name" />
                                    ) : (
                                        <p className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">{user.name || "—"}</p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-xs text-[color:var(--muted)] inline-flex items-center gap-2">
                                        <Mail size={14} /> Email (locked)
                                    </p>
                                    <div className="mt-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] px-4 py-3">
                                        <p className="text-sm text-[color:var(--foreground)]">{user.email || "—"}</p>
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4">
                                    <p className="text-sm font-semibold text-[color:var(--foreground)]">Quick actions</p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <SmallButton variant="soft" onClick={() => router.push("/orders")}>
                                            <Package size={16} /> Orders
                                        </SmallButton>
                                        <SmallButton variant="primary" onClick={() => router.push("/cart")}>
                                            <ShoppingBag size={16} /> Cart
                                        </SmallButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Right: Small summary + logout */}
                    <SectionCard>
                        <p className="text-[11px] tracking-[0.35em] text-[color:var(--muted)]">SUMMARY</p>

                        <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--card-bg)] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[color:var(--muted)]">Orders</p>
                                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                    {loadingStats ? "—" : stats.totalOrders}
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[color:var(--muted)]">Completed</p>
                                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                    {loadingStats ? "—" : stats.completedOrders}
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[color:var(--muted)]">Cancelled</p>
                                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                                    {loadingStats ? "—" : stats.cancelledOrders}
                                </p>
                            </div>

                            <div className="h-px w-full bg-[color:var(--border)]" />

                            <div className="flex items-center justify-between">
                                <p className="text-sm text-[color:var(--muted)]">Cart items</p>
                                <p className="text-sm font-semibold text-[color:var(--foreground)]">{cartCount}</p>
                            </div>
                        </div>

                        <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--soft-bg)] p-4">
                            <p className="text-sm font-semibold text-[color:var(--foreground)]">Signed in as</p>
                            <p className="mt-2 text-sm text-[color:var(--muted)]">
                                <span className="text-[color:var(--foreground)] font-medium">{user.name || "User"}</span>
                                <br />
                                {user.email || "—"}
                            </p>
                        </div>

                        <div className="mt-4">
                            <SmallButton
                                variant="danger"
                                onClick={async () => {
                                    await logout();
                                    router.replace("/");
                                }}
                            >
                                Logout
                            </SmallButton>
                        </div>
                    </SectionCard>
                </div>

                <footer className="mt-10 text-center text-xs text-[color:var(--muted-2)]">
                    © {new Date().getFullYear()} OPTIMAL CLOTHING — Studio
                </footer>
            </div>
        </div>
    );
}
