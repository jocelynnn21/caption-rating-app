"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
    initialFirstName: string;
    initialLastName: string;
    initialAvatarUrl: string | null;
    initialMessage?: string;
};

export default function ProfileForm({
    initialFirstName,
    initialLastName,
    initialAvatarUrl,
    initialMessage = "",
}: ProfileFormProps) {
    const router = useRouter();
    const [firstName, setFirstName] = useState(initialFirstName);
    const [lastName, setLastName] = useState(initialLastName);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(initialMessage);

    const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage("");
        const normalizedFirstName = firstName.trim();
        const normalizedLastName = lastName.trim();

        if (!normalizedFirstName || !normalizedLastName) {
            setMessage("Enter both your first and last name.");
            return;
        }

        setSaving(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setSaving(false);
            router.replace("/login?next=/profile");
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({ first_name: normalizedFirstName, last_name: normalizedLastName })
            .eq("id", user.id);

        if (error) {
            console.error("Error saving profile:", error);
            setMessage("Could not save profile. Try again.");
            setSaving(false);
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const requestedNext = params.get("next");
        const next = ["/", "/lab", "/saved"].includes(requestedNext ?? "")
            ? requestedNext!
            : null;
        const requestedSave = Number(params.get("save"));
        const pendingSavePopupId = Number.isSafeInteger(requestedSave) && requestedSave > 0
            ? requestedSave
            : null;

        if (pendingSavePopupId) {
            const saveResponse = await fetch("/api/saved-popups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ popupId: pendingSavePopupId }),
            }).catch(() => null);

            if (!saveResponse?.ok) {
                setMessage("Profile saved, but the pop-up could not be saved. Try again from Explore.");
                setSaving(false);
                return;
            }
        }

        setMessage("Profile saved!");
        setFirstName(normalizedFirstName);
        setLastName(normalizedLastName);
        setSaving(false);

        if (next) {
            router.replace(next);
            router.refresh();
        }
    };

    const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setMessage("Choose a JPG, PNG, or WebP image.");
            event.target.value = "";
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessage("Choose an image smaller than 5 MB.");
            event.target.value = "";
            return;
        }

        setUploading(true);
        setMessage("");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setUploading(false);
            router.replace("/login?next=/profile");
            return;
        }

        const extensionByType: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
        };
        const filePath = `${user.id}/avatar.${extensionByType[file.type]}`;
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            setMessage("Could not upload photo. Try again.");
            setUploading(false);
            event.target.value = "";
            return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        const publicUrl = data.publicUrl;
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: publicUrl })
            .eq("id", user.id);

        if (updateError) {
            console.error("Profile update error:", updateError);
            setMessage("Photo uploaded, but profile could not be updated. Try again.");
            setUploading(false);
            event.target.value = "";
            return;
        }

        setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
        setMessage("Photo uploaded!");
        setUploading(false);
        event.target.value = "";
    };

    return (
        <main className="min-h-screen bg-background text-foreground">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
                <header className="border-b border-foreground pb-10 md:pb-14">
                    <h1 className="text-[3.25rem] font-medium leading-none tracking-[-0.04em] md:text-8xl">Your profile</h1>
                </header>

                <div className="grid gap-14 py-12 md:grid-cols-2 md:gap-20 md:py-16">
                    <section aria-labelledby="profile-photo-heading">
                        <div className="mb-5 border-b border-[var(--border-subtle)] pb-3">
                            <h2 id="profile-photo-heading" className="text-xs font-semibold uppercase tracking-[0.18em]">Profile photo</h2>
                        </div>

                        <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-[var(--surface-muted)]">
                            {avatarUrl ? (
                                // Supabase public avatar URLs are user-specific and not known at build time.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="Your profile" className="h-full w-full object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                            ) : (
                                <span className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">No photo yet</span>
                            )}
                        </div>

                        <div className="profile-upload-control mt-5 flex items-center justify-between gap-4">
                            <p className="text-xs leading-5 text-[var(--text-muted)]">JPG, PNG, or WebP · 5 MB max</p>
                            <label
                                htmlFor="avatar-upload"
                                className={`inline-flex min-h-11 cursor-pointer items-center border-b border-foreground text-xs font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-50 ${uploading ? "pointer-events-none opacity-40" : ""}`}
                            >
                                {uploading ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
                            </label>
                            <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={uploading} className="sr-only" />
                        </div>
                    </section>

                    <form aria-labelledby="personal-details-heading" onSubmit={saveProfile}>
                        <div className="mb-5 border-b border-[var(--border-subtle)] pb-3">
                            <h2 id="personal-details-heading" className="text-xs font-semibold uppercase tracking-[0.18em]">Personal details</h2>
                        </div>

                        <div className="space-y-10 pt-3">
                            <div>
                                <label htmlFor="first-name" className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">First name</label>
                                <input
                                    id="first-name"
                                    type="text"
                                    autoComplete="given-name"
                                    value={firstName}
                                    required
                                    maxLength={80}
                                    onChange={(event) => setFirstName(event.target.value)}
                                    className="mt-3 w-full border-0 border-b border-foreground bg-transparent px-0 pb-3 text-2xl tracking-[-0.02em] outline-none transition-colors placeholder:text-[var(--text-placeholder)] focus:border-[var(--text-muted)] md:text-3xl"
                                />
                            </div>

                            <div>
                                <label htmlFor="last-name" className="block text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Last name</label>
                                <input
                                    id="last-name"
                                    type="text"
                                    autoComplete="family-name"
                                    value={lastName}
                                    required
                                    maxLength={80}
                                    onChange={(event) => setLastName(event.target.value)}
                                    className="mt-3 w-full border-0 border-b border-foreground bg-transparent px-0 pb-3 text-2xl tracking-[-0.02em] outline-none transition-colors placeholder:text-[var(--text-placeholder)] focus:border-[var(--text-muted)] md:text-3xl"
                                />
                            </div>
                        </div>

                        <div className="mt-14 flex flex-wrap items-center gap-5">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-foreground px-7 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-background transition-[scale,opacity] duration-150 ease-out hover:opacity-70 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {saving ? "Saving…" : "Save profile"}
                            </button>

                            {message && (
                                <p role="status" aria-live="polite" className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{message}</p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
