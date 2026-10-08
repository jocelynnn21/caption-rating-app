"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createClient();

        await supabase.auth.signOut();
        router.replace("/login");
        router.refresh();
    };

    return (
        <button className="sign-out-button" onClick={handleSignOut}>
            Sign out
        </button>
    );
}
