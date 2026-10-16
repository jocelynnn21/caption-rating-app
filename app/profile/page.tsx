import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login?next=/profile");

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

    if (error) console.error("Error loading profile:", error);

    return (
        <ProfileForm
            initialFirstName={profile?.first_name ?? ""}
            initialLastName={profile?.last_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
            initialMessage={error ? "Could not load your profile. Try refreshing the page." : ""}
        />
    );
}
