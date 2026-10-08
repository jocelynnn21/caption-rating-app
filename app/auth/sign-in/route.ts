import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
    let authResponse = NextResponse.next({ request });

    const requestedNext = request.nextUrl.searchParams.get("next");
    const referrer = request.headers.get("referer");
    const referrerNext = referrer
        ? new URL(referrer).searchParams.get("next")
        : null;
    const next = ["/lab", "/saved", "/profile"].includes(
        requestedNext ?? referrerNext ?? ""
    )
        ? requestedNext ?? referrerNext
        : null;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
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

    const callbackUrl = new URL("/auth/callback", request.url);
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: callbackUrl.toString(),
            skipBrowserRedirect: true,
        },
    });

    if (error || !data.url) {
        console.error("Could not start Google OAuth:", error);
        return NextResponse.redirect(new URL("/login?error=oauth", request.url), 303);
    }

    const response = NextResponse.redirect(data.url, 303);

    authResponse.cookies.getAll().forEach((cookie) =>
        response.cookies.set(cookie)
    );

    if (next) {
        response.cookies.set("post_auth_redirect", next, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 600,
        });
    }

    for (const header of ["cache-control", "expires", "pragma"]) {
        const value = authResponse.headers.get(header);
        if (value) response.headers.set(header, value);
    }

    return response;
}
