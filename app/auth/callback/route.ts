import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    const supabase = await createClient();

    const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error("Exchange error:", exchangeError);
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    console.log("USER:", user?.id);
    console.log("USER ERROR:", userError);

    if (!user) {
        return NextResponse.redirect(`${origin}/login`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

    console.log("PROFILE:", profile);
    console.log("PROFILE ERROR:", profileError);

    if (!profile?.first_name || !profile?.last_name) {
        console.log("NAME MISSING → REDIRECTING TO PROFILE");
        return NextResponse.redirect(`${origin}/profile`);
    }

    console.log("PROFILE COMPLETE → REDIRECTING HOME");
    return NextResponse.redirect(`${origin}/`);
}
