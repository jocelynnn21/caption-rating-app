"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "./SignOutButton";

type AuthNavProps = {
    initialIsAuthenticated: boolean;
};

export default function AuthNav({ initialIsAuthenticated }: AuthNavProps) {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(
        initialIsAuthenticated
    );

    useEffect(() => {
        const supabase = createClient();

        const syncSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            setIsAuthenticated(Boolean(session));
        };

        void syncSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(Boolean(session));
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <nav className="site-nav" aria-label="Primary navigation">
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Explore</Link>
            <Link href="/lab" aria-current={pathname === "/lab" ? "page" : undefined}>Daily Drop</Link>
            {isAuthenticated ? (
                <>
                    <Link href="/saved" aria-current={pathname === "/saved" ? "page" : undefined}>Saved</Link>
                    <Link href="/profile" aria-current={pathname === "/profile" ? "page" : undefined}>Profile</Link>
                    <SignOutButton />
                </>
            ) : (
                <Link href="/login" aria-current={pathname === "/login" ? "page" : undefined}>Sign in</Link>
            )}
        </nav>
    );
}
