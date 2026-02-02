import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Login() {
    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/api/auth/google`;
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#f3f4f6] px-4">
            <section className="w-full max-w-[420px] bg-white rounded-[20px] shadow-[0_10px_25px_rgba(0,0,0,0.12)] overflow-hidden">
                {/* CONTENT */}
                <div className="px-10 pt-10 pb-8 flex flex-col items-center text-center">
                    {/* HEADER */}
                    <header className="flex items-center gap-3 mb-4">
                        <Image src="/icons/logo.svg" alt="Logo" width={38} height={38} />
                        <h1 className="text-[20px] font-semibold text-[#111827]">Inbox & Calendar Analyzer</h1>
                    </header>

                    {/* DESCRIPTION */}
                    <p className="text-[15px] text-[#6b7280] leading-[1.6] mb-7 max-w-[300px]">
                        Automatically organize your emails and calendar using AI.
                    </p>

                    {/* GOOGLE BUTTON */}
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full h-[48px] flex items-center justify-center gap-3 border border-[#d1d5db] rounded-[10px] text-[15px] font-medium text-[#111827] hover:bg-[#f9fafb] transition cursor-pointer"
                    >
                        <Image src="/icons/google.svg" alt="Google Logo" width={25} height={25} />
                        Sign In with Google
                    </button>

                    {/* PERMISSION TEXT */}
                    <p className="mt-6 text-[13px] text-[#9ca3af] leading-[1.5] max-w-[280px]">
                        We only request read-only access. No emails or events are modified.
                    </p>
                </div>

                {/* FOOTER */}
                <footer className="border-t border-[#e5e7eb] px-6 py-4 flex items-center justify-center gap-8 text-[13px] text-[#808080] font-medium">
                    <a
                        href="https://github.com/miracsucu4417/inboxClassifier"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        Github
                    </a>
                    <span>© 2026</span>
                </footer>
            </section>
        </main>
    );
};
