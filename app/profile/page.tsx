"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                window.location.href = "/login";
                return;
            }

            const { data: profile, error } = await supabase
                .from("profiles")
                .select("first_name, last_name, avatar_url")
                .eq("id", user.id)
                .single();

            if (error) {
                console.error("Error loading profile:", error);
            }

            if (profile) {
                setFirstName(profile.first_name ?? "");
                setLastName(profile.last_name ?? "");
                setAvatarUrl(profile.avatar_url ?? null);
            }

            setLoading(false);
        };

        loadProfile();
    }, []);

    const saveProfile = async () => {
        setMessage("");
        setSaving(true);

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            window.location.href = "/login";
            return;
        }

        const { error } = await supabase
            .from("profiles")
            .update({
                first_name: firstName,
                last_name: lastName,
            })
            .eq("id", user.id);

        if (error) {
            console.error("Error saving profile:", error);
            setMessage("Could not save profile.");
            setSaving(false);
            return;
        }

        setMessage("Profile saved!");
        setSaving(false);
    };

    const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setUploading(true);
        setMessage("");

        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        const { data: sessionData } = await supabase.auth.getSession();

        console.log("USER ID:", user?.id);
        console.log("HAS SESSION:", !!sessionData.session);
        console.log("USER ROLE:", sessionData.session?.user?.role);

        if (!user) {
            window.location.href = "/login";
            return;
        }

        const fileExtension = file.name.split(".").pop();
        const filePath = `${user.id}/avatar-${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file);

        if (uploadError) {
            console.error("Upload error:", uploadError);
            setMessage("Could not upload photo.");
            setUploading(false);
            return;
        }

        const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const publicUrl = data.publicUrl;

        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                avatar_url: publicUrl,
            })
            .eq("id", user.id);

        if (updateError) {
            console.error("Profile update error:", updateError);
            setMessage("Photo uploaded, but profile could not be updated.");
            setUploading(false);
            return;
        }

        // Cache-buster so a replacement avatar updates immediately
        setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
        setMessage("Photo uploaded!");
        setUploading(false);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#f7f6f2] px-6 py-16 text-black md:px-10 md:py-24">
                <div className="mx-auto max-w-7xl">
                    <p className="text-xs font-medium uppercase tracking-[0.2em]">
                        Loading profile…
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#f7f6f2] text-black">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
                <header className="border-b border-black pb-10 md:pb-14">
                    <p className="mb-5 text-xs font-medium uppercase tracking-[0.22em]">
                        Account / Profile
                    </p>
                    <h1 className="text-6xl font-medium leading-none tracking-[-0.055em] md:text-8xl">
                        Your profile
                    </h1>
                </header>

                <div className="grid gap-14 py-12 md:grid-cols-2 md:gap-20 md:py-16">
                    <section aria-labelledby="profile-photo-heading">
                        <div className="mb-5 flex items-end justify-between border-b border-neutral-400 pb-3">
                            <h2
                                id="profile-photo-heading"
                                className="text-xs font-semibold uppercase tracking-[0.18em]"
                            >
                                Profile photo
                            </h2>
                            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                                01
                            </span>
                        </div>

                        <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-neutral-200">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Your profile"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                                    No photo yet
                                </span>
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-4">
                            <p className="text-xs leading-5 text-neutral-500">
                                JPG, PNG, or WebP
                            </p>
                            <label
                                htmlFor="avatar-upload"
                                className={`inline-flex cursor-pointer items-center border-b border-black pb-1 text-xs font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-50 ${
                                    uploading ? "pointer-events-none opacity-40" : ""
                                }`}
                            >
                                {uploading ? "Uploading…" : avatarUrl ? "Replace photo" : "Upload photo"}
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={uploadAvatar}
                                disabled={uploading}
                                className="sr-only"
                            />
                        </div>
                    </section>

                    <section aria-labelledby="personal-details-heading">
                        <div className="mb-5 flex items-end justify-between border-b border-neutral-400 pb-3">
                            <h2
                                id="personal-details-heading"
                                className="text-xs font-semibold uppercase tracking-[0.18em]"
                            >
                                Personal details
                            </h2>
                            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                                02
                            </span>
                        </div>

                        <div className="space-y-10 pt-3">
                            <div>
                                <label
                                    htmlFor="first-name"
                                    className="block text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500"
                                >
                                    First name
                                </label>
                                <input
                                    id="first-name"
                                    type="text"
                                    autoComplete="given-name"
                                    value={firstName}
                                    onChange={(event) => setFirstName(event.target.value)}
                                    className="mt-3 w-full border-0 border-b border-black bg-transparent px-0 pb-3 text-2xl tracking-[-0.02em] outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 md:text-3xl"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="last-name"
                                    className="block text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500"
                                >
                                    Last name
                                </label>
                                <input
                                    id="last-name"
                                    type="text"
                                    autoComplete="family-name"
                                    value={lastName}
                                    onChange={(event) => setLastName(event.target.value)}
                                    className="mt-3 w-full border-0 border-b border-black bg-transparent px-0 pb-3 text-2xl tracking-[-0.02em] outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 md:text-3xl"
                                />
                            </div>
                        </div>

                        <div className="mt-14 flex flex-wrap items-center gap-5">
                            <button
                                type="button"
                                onClick={saveProfile}
                                disabled={saving}
                                className="bg-black px-7 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#f7f6f2] transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {saving ? "Saving…" : "Save profile"}
                            </button>

                            {message && (
                                <p
                                    role="status"
                                    aria-live="polite"
                                    className="text-xs uppercase tracking-[0.12em] text-neutral-600"
                                >
                                    {message}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
