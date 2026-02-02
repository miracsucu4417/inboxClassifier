"use client";

import { useEffect, useState } from "react";
import type { User } from "./types/user";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Page() {
    const [user, setUser] = useState<User | null>(null);

    const handleLogout = async () => {
        await fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: {
                Pragma: "no-cache",
                "Cache-Control": "no-cache",
            },
        });

        setUser(null);
    };

    const checkUser = async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                credentials: "include",
            });

            if (!res.ok) {
                setUser(null);
            } else {
                const data = await res.json();
                setUser(data.user);
            }
        } catch {
            setUser(null);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    if (!user) {
        return <Login />;
    }

    return <Dashboard user={user} handleLogout={handleLogout} />;
}


