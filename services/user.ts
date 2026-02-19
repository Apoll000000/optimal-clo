const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function updateMyProfile(input: { name: string; avatarFile?: File | null }) {
    const fd = new FormData();
    fd.append("name", input.name);
    if (input.avatarFile) fd.append("avatar", input.avatarFile);

    const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        body: fd,
        credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to update profile");
    return data.user as { id: string; email: string; name: string; avatar?: string };
}
