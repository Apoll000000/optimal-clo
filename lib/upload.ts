import { API_BASE } from "@/lib/api";

export async function uploadImage(file: File, folder = "products") {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch(`${API_BASE}/api/upload?folder=${encodeURIComponent(folder)}`, {
        method: "POST",
        body: fd,
        credentials: "include",
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed: ${res.status}`);
    }

    return res.json() as Promise<{ url: string; publicId?: string }>;
}
