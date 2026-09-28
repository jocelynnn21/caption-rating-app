"use client";

import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
    const handleSignOut = async () => {
        const supabase = createClient();

        await supabase.auth.signOut();

        window.location.href = "/login";
    };

    return (
        <button className="sign-out-button" onClick={handleSignOut}>
            Sign out
        </button>
    );
}