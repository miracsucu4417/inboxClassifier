"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { User } from "../types/user";

export default function Header({
    user,
    handleLogout,
    handleDeleteAccount,
}: {
    user: User;
    handleLogout: () => void;
    handleDeleteAccount: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // dışarı tıklayınca dropdown kapansın
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <>
            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                    <Image src="/icons/logo.svg" alt="Logo" width={32} height={32} />
                    <h1 className="text-[18px] font-semibold text-[#111827]">Inbox & Calendar Analyzer</h1>
                </div>

                {/* PROFILE + DROPDOWN */}
                <div ref={menuRef} className="relative">
                    <button onClick={() => setMenuOpen((p) => !p)} className="flex items-center gap-2">
                        <Image src={user.picture_url} alt="User" width={32} height={32} className="rounded-full" />
                        <span className="text-sm font-medium text-gray-700">{user.full_name}</span>
                        <Image src="/icons/triangle.svg" alt="▼" width={10} height={10} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-44 rounded-lg bg-white border shadow-md z-50">
                            <button
                                className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                                onClick={() => {
                                    setMenuOpen(false);
                                    handleLogout();
                                }}
                            >
                                Log out
                            </button>

                            <button
                                className="block w-full px-4 py-2 text-sm text-left text-red-500 hover:bg-red-50"
                                onClick={() => {
                                    setMenuOpen(false);
                                    setConfirmOpen(true);
                                }}
                            >
                                Delete account
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* MODAL */}
            {confirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* backdrop */}
                    <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />

                    {/* modal box */}
                    <div className="relative z-10 w-[420px] rounded-xl bg-white p-6 shadow-lg">
                        <div className="flex items-start gap-3">
                            <div className="text-red-500 text-xl">⚠️</div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Delete account</h2>
                                <p className="mt-2 text-sm text-gray-600">
                                    This will permanently delete your account and remove all associated email and calendar data.
                                </p>
                                <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmOpen(false)}
                                className="px-4 py-2 text-sm rounded-md border hover:bg-gray-100"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    setConfirmOpen(false);
                                    handleDeleteAccount();
                                }}
                                className="px-4 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
                            >
                                Delete account
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
