import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <header className="site-header">
            <div className="site-header-inner">
                <Link href="/" className="site-logo">
                    POPUP.NYC
                </Link>

                <nav className="site-nav" aria-label="Primary navigation">
                    <Link href="/">Explore</Link>
                    {user ? (
                        <>
                            <Link href="/saved">Saved</Link>
                            <Link href="/profile">Profile</Link>
                            <SignOutButton />
                        </>
                    ) : (
                        <Link href="/login">Sign in</Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
