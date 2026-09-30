import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    const redirect = (path: string) => {
        const response = NextResponse.redirect(`${origin}${path}`, 303);
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        return response;
    };

    if (!code) {
        return redirect("/auth/auth-code-error");
    }

    const supabase = await createClient();

    const { data: authData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error("Exchange error:", exchangeError);
        return redirect("/auth/auth-code-error");
    }

    const user = authData.user;

    if (!user) {
        return redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

    if (!profile?.first_name || !profile?.last_name) {
        return redirect("/profile");
    }

    return redirect("/");
}
