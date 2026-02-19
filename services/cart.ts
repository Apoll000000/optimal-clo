"use client";

import { api } from "@/lib/api";

export type CartItem = {
    id: string;         // productId string
    name: string;
    subtitle?: string;
    price: number;      // unitPrice
    image?: string;
    qty: number;
    variant?: string;   // variantId
    variantName?: string;
};

const CART_EVENT = "optimal:cart-updated";

function emitCartUpdate() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(CART_EVENT));
}

function mapFromServer(cart: any): CartItem[] {
    const items = cart?.items || [];
    return items.map((it: any) => ({
        id: String(it.productId),
        name: it.name || "",
        subtitle: it.variantName ? `Variant: ${it.variantName}` : "Premium cotton · Print-on-demand",
        price: Number(it.unitPrice || 0),
        image: it.image || "",
        qty: Number(it.qty || 1),
        variant: it.variantId || "",
        variantName: it.variantName || "",
    }));
}

export function cartSubtotal(items: CartItem[]) {
    return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}

// ✅ GET current cart (server)
export async function getCart(): Promise<CartItem[]> {
    const cart = await api<any>(`/api/cart`, { method: "GET" });
    return mapFromServer(cart);
}

// ✅ Add item (server)
export async function addItem(payload: {
    productId: string;
    qty?: number;
    variantId?: string;
    variantName?: string;
}): Promise<CartItem[]> {
    const cart = await api<any>(`/api/cart/items`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

    const items = mapFromServer(cart);
    emitCartUpdate(); // ✅ notify UI
    return items;
}

// ✅ Update qty (server)
export async function updateQty(
    productId: string,
    variantId: string | undefined,
    qty: number
): Promise<CartItem[]> {
    const cart = await api<any>(`/api/cart/items`, {
        method: "PATCH",
        body: JSON.stringify({ productId, variantId: variantId || "", qty }),
    });

    const items = mapFromServer(cart);
    emitCartUpdate(); // ✅ notify UI
    return items;
}

// ✅ Remove item (server)
export async function removeItem(
    productId: string,
    variantId: string | undefined
): Promise<CartItem[]> {
    const cart = await api<any>(
        `/api/cart/items?productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId || "")}`,
        { method: "DELETE" }
    );

    const items = mapFromServer(cart);
    emitCartUpdate(); // ✅ notify UI
    return items;
}

// ✅ Clear cart (server) — used after successful checkout
export async function clearCart(): Promise<void> {
    await api(`/api/cart`, { method: "DELETE" });
    emitCartUpdate(); // ✅ notify UI (cartCount becomes 0)
}

if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("optimal:cart-updated"));
}
