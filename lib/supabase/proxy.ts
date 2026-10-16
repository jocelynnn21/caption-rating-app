import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

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

                    response = NextResponse.next({ request });

                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );

                    Object.entries(headers).forEach(([key, value]) =>
                        response.headers.set(key, value)
                    );
                },
            },
        }
    );

    // This validates the current token and refreshes it when necessary.
    // Keep it immediately after client creation so request and response cookies
    // cannot drift apart before Server Components render.
    const { data } = await supabase.auth.getClaims();

    if (request.nextUrl.pathname === "/profile" && !data?.claims?.sub) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = "";
        loginUrl.searchParams.set("next", "/profile");
        const redirect = NextResponse.redirect(loginUrl);
        response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
        return redirect;
    }

    return response;
}
