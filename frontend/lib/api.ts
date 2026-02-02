const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function refreshCategories(type: "mail" | "event", token: string) {
    const res = await fetch(`${API_URL}/data/refresh/${type}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw new Error("Refresh failed");
    }

    return res.json(); // { status, total, categoryCount, categories }
}
