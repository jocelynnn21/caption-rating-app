import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const requestedNext = request.cookies.get("post_auth_redirect")?.value;
    const requestedSave = request.cookies.get("post_auth_save_popup")?.value;
    const next = ["/lab", "/saved", "/profile"].includes(requestedNext ?? "")
        ? requestedNext!
        : "/";
    const parsedSave = requestedSave ? Number(requestedSave) : NaN;
    const pendingSavePopupId = Number.isSafeInteger(parsedSave) && parsedSave > 0
        ? parsedSave
        : null;
    let authResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );

                    authResponse = NextResponse.next({ request });

                    cookiesToSet.forEach(({ name, value, options }) =>
                        authResponse.cookies.set(name, value, options)
                    );

                    Object.entries(headers).forEach(([key, value]) =>
                        authResponse.headers.set(key, value)
                    );
                },
            },
        }
    );

    const redirect = (path: string) => {
        const response = NextResponse.redirect(`${origin}${path}`, 303);

        authResponse.cookies.getAll().forEach((cookie) =>
            response.cookies.set(cookie)
        );

        for (const header of ["expires", "pragma"]) {
            const value = authResponse.headers.get(header);
            if (value) response.headers.set(header, value);
        }

        response.cookies.delete("post_auth_redirect");
        response.cookies.delete("post_auth_save_popup");
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        return response;
    };
    const loginErrorParams = new URLSearchParams({ error: "oauth", next });
    if (pendingSavePopupId) {
        loginErrorParams.set("save", String(pendingSavePopupId));
    }
    const loginErrorPath = `/login?${loginErrorParams.toString()}`;

    if (!code) {
        const {
            data: { user: existingUser },
        } = await supabase.auth.getUser();

        return redirect(existingUser ? next : loginErrorPath);
    }

    const { data: authData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error("Exchange error:", exchangeError);
        const {
            data: { user: existingUser },
        } = await supabase.auth.getUser();

        return redirect(existingUser ? next : loginErrorPath);
    }

    const user = authData.user;

    if (!user) {
        return redirect(loginErrorPath);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

    if (!profile?.first_name || !profile?.last_name) {
        const profileParams = new URLSearchParams();
        if (next !== "/profile") profileParams.set("next", next);
        if (pendingSavePopupId) profileParams.set("save", String(pendingSavePopupId));
        const profilePath = profileParams.size > 0
            ? `/profile?${profileParams.toString()}`
            : "/profile";
        return redirect(profilePath);
    }

    if (pendingSavePopupId) {
        const { error: saveError } = await supabase.from("saved_popups").upsert(
            { user_id: user.id, popup_id: pendingSavePopupId },
            { onConflict: "user_id,popup_id" }
        );

        if (saveError) {
            console.error("Could not finish the pending save after sign-in:", saveError);
            return redirect("/?saveError=1");
        }
    }

    return redirect(next);
}
