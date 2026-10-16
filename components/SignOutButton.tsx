"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSignOut = async () => {
        if (isPending) return;
        setIsPending(true);
        setErrorMessage("");
        const supabase = createClient();

        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.replace("/login");
            router.refresh();
        } catch {
            setErrorMessage("Could not sign out. Try again.");
            setIsPending(false);
        }
    };

    return (
        <div className="sign-out-control">
            <button
                type="button"
                className="sign-out-button"
                onClick={handleSignOut}
                disabled={isPending}
            >
                {isPending ? "Signing out…" : "Sign out"}
            </button>
            {errorMessage && (
                <span className="sign-out-error" role="alert">{errorMessage}</span>
            )}
        </div>
    );
}
