"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SavePopupButtonProps = {
    popupId: number;
    initialSaved: boolean;
    isAuthenticated: boolean;
};

export default function SavePopupButton({ popupId, initialSaved, isAuthenticated }: SavePopupButtonProps) {
    const router = useRouter();
    const [isSaved, setIsSaved] = useState(initialSaved);
    const [isPending, setIsPending] = useState(false);
    const [message, setMessage] = useState("");

    const toggleSave = async () => {
        if (!isAuthenticated) {
            router.push("/login?next=/");
            return;
        }

        const nextSaved = !isSaved;
        setIsSaved(nextSaved);
        setIsPending(true);
        setMessage(nextSaved ? "Saved" : "Removed");

        try {
            const response = await fetch("/api/saved-popups", {
                method: nextSaved ? "POST" : "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ popupId }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    router.push("/login?next=/");
                    return;
                }
                throw new Error("Save request failed");
            }

            router.refresh();
        } catch {
            setIsSaved(!nextSaved);
            setMessage("Could not save");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="popup-save-control">
            <button type="button" onClick={toggleSave} disabled={isPending} aria-pressed={isSaved} className="popup-save-button">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.5 3.5h9v13L10 13.4l-4.5 3.1v-13Z" />
                </svg>
                <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
            <span
                className={message === "Could not save" ? "popup-save-error" : "sr-only"}
                aria-live="polite"
            >
                {message}
            </span>
        </div>
    );
}
