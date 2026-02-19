"use client";

import { api } from "@/lib/api";

export type OrderItem = {
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    qty: number;
    unitPrice: number;
    image?: string; // ✅ for preview pic
};

export type OrderStatus =
    | "pending"
    | "approved"
    | "paid" // optional, keep if you plan to use it later
    | "shipped"
    | "delivered"
    | "cancelled";

export type Order = {
    id: string;
    customerName: string;
    customerEmail: string;
    phone?: string;
    address?: string;
    city?: string;
    notes?: string;
    paymentMethod?: string;

    items: OrderItem[];

    courier?: string;   // ✅ add
    tracking?: string;

    shippingFee: number;
    subtotal: number;
    total: number;

    status: OrderStatus;
    createdAt: string;
    updatedAt?: string; // ✅ useful for admin/logistics UI
};

function isoDate(d: any) {
    if (!d) return "—";
    try {
        return String(d).slice(0, 10);
    } catch {
        return "—";
    }
}

function normalizeItem(it: any): OrderItem {
    return {
        productId: String(it?.productId ?? ""),
        productName: String(it?.productName ?? ""),
        variantId: it?.variantId ? String(it.variantId) : "",
        variantName: it?.variantName ? String(it.variantName) : "",
        qty: Number(it?.qty ?? 1),
        unitPrice: Number(it?.unitPrice ?? 0),
        image: it?.image ? String(it.image) : "",
    };
}

function normalizeOrder(o: any): Order {
    return {
        id: o._id ?? o.id,
        customerName: o.customerName ?? "",
        customerEmail: o.customerEmail ?? "",
        phone: o.phone ?? "",
        address: o.address ?? "",
        city: o.city ?? "",
        notes: o.notes ?? "",
        paymentMethod: o.paymentMethod ?? "cod",

        items: Array.isArray(o.items) ? o.items.map(normalizeItem) : [],

        shippingFee: Number(o.shippingFee ?? 0),
        subtotal: Number(o.subtotal ?? 0),
        total: Number(o.total ?? 0),

        courier: o.courier ?? "",
        tracking: o.tracking ?? "",


        status: (o.status ?? "pending") as OrderStatus,
        createdAt: isoDate(o.createdAt),
        updatedAt: isoDate(o.updatedAt),
    };
}

export async function createOrder(payload: any) {
    const res = await api<any>(`/api/orders`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return normalizeOrder(res);
}

/**
 * NOTE:
 * Your backend earlier supports GET /api/orders?email=...
 * but your code calls ?mine=1.
 *
 * ✅ Keep mine=1 if you implemented it already.
 * If not, tell me — I’ll adjust this to use email from session/user.
 */
export async function getMyOrders(email: string): Promise<Order[]> {
    const safe = encodeURIComponent((email || "").trim().toLowerCase());
    const data = await api<any[]>(`/api/orders?email=${safe}`, { method: "GET" });
    return (data || []).map(normalizeOrder);
}


export async function getOrderById(id: string): Promise<Order> {
    const data = await api<any>(`/api/orders/${id}`, { method: "GET" });
    return normalizeOrder(data);
}

// generic patch (we’ll use for cancel + future updates)
export async function updateOrder(id: string, patch: Partial<Order>) {
    const data = await api<any>(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    });
    return normalizeOrder(data);
}

