"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "./SignOutButton";

type AuthNavProps = {
    initialIsAuthenticated: boolean;
};

export default function AuthNav({ initialIsAuthenticated }: AuthNavProps) {
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
            <Link href="/">Explore</Link>
            {isAuthenticated ? (
                <>
                    <Link href="/saved">Saved</Link>
                    <Link href="/profile">Profile</Link>
                    <SignOutButton />
                </>
            ) : (
                <Link href="/login">Sign in</Link>
            )}
        </nav>
    );
}
