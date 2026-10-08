import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const requestedNext = request.cookies.get("post_auth_redirect")?.value;
    const next = ["/lab", "/saved", "/profile"].includes(requestedNext ?? "")
        ? requestedNext!
        : "/";
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
        response.headers.set("Cache-Control", "private, no-store, max-age=0");
        return response;
    };
    const loginErrorPath = `/login?error=oauth&next=${encodeURIComponent(next)}`;

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
        return redirect("/profile");
    }

    return redirect(next);
}
