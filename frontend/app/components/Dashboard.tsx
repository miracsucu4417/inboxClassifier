import Header from "./Header";
import { useEffect, useState, useRef } from "react";
import CategoryCard from "./CategoryCard";
import type { User } from "../types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type RawCategory = {
    category: string;
    count: number;
};

type CategoryUI = RawCategory & {
    color: string;
    percentage: number;
};

type Tab = "gmail" | "calendar";

type LoadState = { status: "loading" } | { status: "success"; data: any[] } | { status: "error"; reason: "permission" | "generic" };

const categoryList = [
    "work",
    "personal",
    "finance",
    "shopping",
    "education",
    "social",
    "promotion",
    "health",
    "travel",
    "deadline",
    "spam",
    "other",
];

const CATEGORY_COLOR_MAP: Record<string, string> = {
    work: "#4B5563",
    personal: "#8B7CF6",
    finance: "#4CAF8F",
    shopping: "#EE7C8B",
    education: "#4785F6",
    social: "#5AB6E8",
    promotion: "#EE945F",
    health: "#6BCF9B",
    travel: "#48C4AC",
    deadline: "#EA6767",
    spam: "#9CA3AF",
    other: "#7B8A9E",
};

const randomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomCategory = () => {
    const size = randomInt(1, categoryList.length);

    const shuffled = [...categoryList].sort(() => Math.random() - 0.5).slice(0, size);

    // return shuffled.map((category) => ({
    //     category,
    //     count: randomInt(1, 100),
    // }));

    return [];
};

const prepareCategoriesForUI = (categories: RawCategory[]): CategoryUI[] => {
    const totalCount = categories.reduce((sum, item) => sum + item.count, 0);

    if (totalCount === 0) return [];

    return [...categories]
        .sort((a, b) => b.count - a.count)
        .map((item) => ({
            ...item,
            color: CATEGORY_COLOR_MAP[item.category] ?? "#7B8A9E",
            percentage: Math.round((item.count / totalCount) * 100),
        }));
};

export default function Dashboard({ user, handleLogout, handleDeleteAccount }: { user: any; handleLogout: () => void; handleDeleteAccount: () => void }) {
    const [activeTab, setActiveTab] = useState<Tab>("gmail");

    const [gmailState, setGmailState] = useState<LoadState>({
        status: "loading",
    });

    const [calendarState, setCalendarState] = useState<LoadState>({
        status: "loading",
    });

    /* -------------------- GMAIL -------------------- */
    useEffect(() => {
        const loadGmail = async () => {
            try {
                setGmailState({ status: "loading" });

                const res = await fetch(`${API_URL}/api/data/refresh/mail`, {
                    method: "POST",
                    credentials: "include",
                });

                if (res.status === 403) {
                    setGmailState({
                        status: "error",
                        reason: "permission",
                    });
                    return;
                }

                if (!res.ok) {
                    setGmailState({
                        status: "error",
                        reason: "generic",
                    });
                    return;
                }

                const data = await res.json();

                setGmailState({
                    status: "success",
                    data: prepareCategoriesForUI(data.categories),
                });
            } catch (err) {
                console.error(err);
                setGmailState({
                    status: "error",
                    reason: "generic",
                });
            }
        };

        loadGmail();
    }, []);

    /* -------------------- CALENDAR -------------------- */
    useEffect(() => {
        const loadCalendar = async () => {
            try {
                setCalendarState({ status: "loading" });

                const res = await fetch(`${API_URL}/api/data/refresh/event`, {
                    method: "POST",
                    credentials: "include",
                });

                if (res.status === 403) {
                    setCalendarState({
                        status: "error",
                        reason: "permission",
                    });
                    return;
                }

                if (!res.ok) {
                    setCalendarState({
                        status: "error",
                        reason: "generic",
                    });
                    return;
                }

                const data = await res.json();

                setCalendarState({
                    status: "success",
                    data: prepareCategoriesForUI(data.categories),
                });
            } catch (err) {
                console.error(err);
                setCalendarState({
                    status: "error",
                    reason: "generic",
                });
            }
        };

        loadCalendar();
    }, []);

    return (
        <main className="min-h-screen bg-[#EFEFF3] flex items-center justify-center md:py-16 font-sans">
            <div className="w-[720px] bg-white rounded-xl border shadow-sm">
                {/* HEADER */}
                <Header user={user} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} />

                {/* TABS */}
                <Tabs activeTab={activeTab} onChange={setActiveTab} />

                {/* GMAIL */}
                <CategorySection state={gmailState} hidden={activeTab !== "gmail"} type="gmail" onReauth={handleLogout} />

                {/* CALENDAR */}
                <CategorySection state={calendarState} hidden={activeTab !== "calendar"} type="calendar" onReauth={handleLogout} />

                {/* FOOTER */}
                <footer className="border-t py-4 text-center text-sm text-gray-500">
                    <a href="https://github.com/miracsucu4417/inboxClassifier" target="_blank" className="mr-4 hover:underline">
                        Github
                    </a>
                    © 2026
                </footer>
            </div>
        </main>
    );
}

const CategorySkeleton = () => {
    return (
        <div className="rounded-xl border p-4 bg-white animate-pulse">
            <div className="flex items-start gap-3">
                {/* icon */}
                <div className="w-10 h-10 rounded-lg bg-gray-200" />

                <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                    <div className="h-3 w-20 bg-gray-200 rounded" />

                    {/* progress bar */}
                    <div className="mt-3 h-2 w-full bg-gray-200 rounded-full" />
                </div>
            </div>
        </div>
    );
};

type TabsProps = {
    activeTab: "gmail" | "calendar";
    onChange: (tab: "gmail" | "calendar") => void;
};

const Tabs = ({ activeTab, onChange }: TabsProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const gmailRef = useRef<HTMLButtonElement>(null);
    const calendarRef = useRef<HTMLButtonElement>(null);

    const [indicatorStyle, setIndicatorStyle] = useState({
        width: 0,
        left: 0,
    });

    useEffect(() => {
        const activeRef = activeTab === "gmail" ? gmailRef.current : calendarRef.current;

        if (activeRef && containerRef.current) {
            setIndicatorStyle({
                width: activeRef.offsetWidth,
                left: activeRef.offsetLeft,
            });
        }
    }, [activeTab]);

    return (
        <div ref={containerRef} className="relative border-b mt-3">
            <div className="flex gap-8 px-6">
                <button
                    ref={gmailRef}
                    onClick={() => onChange("gmail")}
                    className={`pb-3 text-sm font-medium transition-colors ${
                        activeTab === "gmail" ? "text-blue-600" : "text-gray-500"
                    }`}
                >
                    Gmail
                </button>

                <button
                    ref={calendarRef}
                    onClick={() => onChange("calendar")}
                    className={`pb-3 text-sm font-medium transition-colors ${
                        activeTab === "calendar" ? "text-blue-600" : "text-gray-500"
                    }`}
                >
                    Calendar
                </button>
            </div>

            {/* animated underline */}
            <span
                className="
          absolute bottom-0 h-[2px] bg-blue-500
          transition-all duration-300 ease-out
        "
                style={{
                    width: indicatorStyle.width,
                    transform: `translateX(${indicatorStyle.left}px)`,
                }}
            />
        </div>
    );
};

type SectionType = "gmail" | "calendar";

const CategorySection = ({
    state,
    hidden,
    type,
    onReauth,
}: {
    state: LoadState;
    hidden: boolean;
    type: "gmail" | "calendar";
    onReauth: () => void;
}) => {
    if (hidden) return null;

    /* -------------------- LOADING -------------------- */
    if (state.status === "loading") {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <CategorySkeleton key={i} />
                ))}
            </div>
        );
    }

    /* -------------------- PERMISSION ERROR -------------------- */
    if (state.status === "error" && state.reason === "permission") {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="text-4xl mb-3">🔐</div>
                <h3 className="text-lg font-semibold text-gray-700">Google permission required</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Please log out and sign in again, making sure to allow Gmail and Calendar permissions.
                </p>
                <button onClick={onReauth} className="mt-4 px-4 py-2 rounded-md bg-black text-white text-sm hover:opacity-90">
                    Log out & re-login
                </button>
            </div>
        );
    }

    /* -------------------- GENERIC ERROR -------------------- */
    if (state.status === "error") {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="text-4xl mb-3">⚠️</div>
                <h3 className="text-lg font-semibold text-gray-700">Something went wrong</h3>
                <p className="text-sm text-gray-500 mt-1">Please try again later.</p>
            </div>
        );
    }

    /* -------------------- EMPTY -------------------- */
    if (state.data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="text-gray-400 mb-3 text-4xl">{type === "gmail" ? "📭" : "📅"}</div>
                <h3 className="text-lg font-semibold text-gray-700">{type === "gmail" ? "No emails found" : "No events found"}</h3>
                <p className="text-sm text-gray-500 mt-1">
                    {type === "gmail" ? "There are no emails in this category yet." : "There are no calendar events available."}
                </p>
            </div>
        );
    }

    /* -------------------- DATA -------------------- */
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {state.data.map((item) => (
                <CategoryCard key={item.category} item={item} isVisible type={type} />
            ))}
        </div>
    );
}
