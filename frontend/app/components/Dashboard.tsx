import Header from "./Header";
import type { User } from "../types/user";
import { useEffect, useState, useRef } from "react";
import CategoryCard from "./CategoryCard";

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

export default function Dashboard({ user, handleLogout }: { user: User; handleLogout: () => void }) {
    const [activeTab, setActiveTab] = useState<Tab>("gmail");

    const [gmailCategories, setGmailCategories] = useState<any[] | null>(null);
    const [calendarCategories, setCalendarCategories] = useState<any[] | null>(null);

    useEffect(() => {
        const loadGmail = async () => {
            try {
                // ⏳ loading
                setGmailCategories(null);

                const res = await fetch(`${API_URL}/api/data/refresh/mail`, {
                    method: "POST",
                    credentials: "include", // 🔑 COOKIE
                });

                if (!res.ok) {
                    throw new Error("Failed to refresh mail");
                }

                const data = await res.json();

                setGmailCategories(prepareCategoriesForUI(data.categories));
            } catch (error) {
                console.error(error);
                setGmailCategories([]); // empty / error state
            }
        };

        loadGmail();
    }, []);

    useEffect(() => {
        const loadCalendar = async () => {
            try {
                setCalendarCategories(null);

                const res = await fetch(`${API_URL}/api/data/refresh/event`, {
                    method: "POST",
                    credentials: "include", // 🔑 COOKIE
                });

                if (!res.ok) {
                    throw new Error("Failed to refresh event");
                }

                const data = await res.json();

                setCalendarCategories(prepareCategoriesForUI(data.categories));
            } catch (error) {
                console.error(error);
                setCalendarCategories([]);
            }
        };

        loadCalendar();
    }, []);

    const activeData = activeTab === "gmail" ? gmailCategories : calendarCategories;

    return (
        <main className="min-h-screen bg-[#EFEFF3] flex items-center justify-center md:py-16 font-sans">
            <div className="w-[720px] bg-white rounded-xl border shadow-sm">
                {/* HEADER */}
                <Header user={user} handleLogout={handleLogout} />

                {/* TABS */}
                <Tabs activeTab={activeTab} onChange={setActiveTab} />

                {/* CARDS */}
                <CategorySection categories={gmailCategories} hidden={activeTab !== "gmail"} type="gmail" />

                <CategorySection categories={calendarCategories} hidden={activeTab !== "calendar"} type="calendar" />

                {/* FOOTER */}
                <footer className="border-t py-4 text-center text-sm text-color-[#808080]">
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
    categories,
    hidden,
    type,
}: {
    categories: CategoryUI[] | null;
    hidden: boolean;
    type: "gmail" | "calendar";
}) => {
    return (
        <section className={`${hidden ? "hidden" : ""}`}>
            {/* LOADING */}
            {categories === null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <CategorySkeleton key={i} />
                    ))}
                </div>
            )}

            {/* EMPTY */}
            {categories?.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="text-gray-400 mb-3 text-4xl">{type === "gmail" ? "📭" : "📅"}</div>
                    <h3 className="text-lg font-semibold text-gray-700">{type === "gmail" ? "No emails found" : "No events found"}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {type === "gmail" ? "There are no emails in this category yet." : "There are no calendar events available."}
                    </p>
                </div>
            )}

            {/* DATA */}
            {categories && categories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                    {categories.map((item) => (
                        <CategoryCard key={item.category} item={item} isVisible={!hidden} type={type} />
                    ))}
                </div>
            )}
        </section>
    );
};
