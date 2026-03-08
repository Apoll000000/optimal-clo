import { Product } from "@/types";

const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export async function getProducts(params: {
    page: number;
    limit: number;
    category?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    });

    const res = await fetch(`${BASE}/api/products?${qs.toString()}`, {
        // Server-side fetch ok
        cache: "no-store",
    });

    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();

    return {
        products: (json.data ?? []) as Product[],
        total: json.pagination?.total ?? json.count ?? 0,
        pages: json.pagination?.pages ?? 1,
    };
}
