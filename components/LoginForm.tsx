"use client";

import { useState } from "react";

type LoginFormProps = {
    next: string;
};

export default function LoginForm({ next }: LoginFormProps) {
    const [loading, setLoading] = useState(false);

    return (
        <form action="/auth/sign-in" method="get" onSubmit={() => setLoading(true)}>
            <input type="hidden" name="next" value={next} />
            <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-between border border-black bg-transparent px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] transition-[scale,background-color,color] duration-150 ease-out hover:bg-black hover:text-[#f7f6f2] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
            >
                <span>{loading ? "Connecting…" : "Continue with Google"}</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                    <path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
                    <path fill="currentColor" d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" opacity=".8" />
                    <path fill="currentColor" d="M6.39 13.88A6.02 6.02 0 0 1 6.08 12c0-.65.11-1.28.31-1.88v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.48l3.35-2.6Z" opacity=".6" />
                    <path fill="currentColor" d="M12 5.99c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.6C7.18 7.75 9.39 5.99 12 5.99Z" opacity=".4" />
                </svg>
            </button>
        </form>
    );
}
