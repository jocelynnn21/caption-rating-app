import { createClient } from "@/lib/supabase/server";

async function getRequestContext(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: Response.json({ error: "Sign in required." }, { status: 401 }) };

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return { error: Response.json({ error: "Invalid request." }, { status: 400 }) };
    }

    const popupId = typeof body === "object" && body !== null && "popupId" in body
        ? (body as { popupId?: unknown }).popupId
        : null;
    if (typeof popupId !== "number" || !Number.isSafeInteger(popupId) || popupId <= 0) {
        return { error: Response.json({ error: "Invalid pop-up." }, { status: 400 }) };
    }
    return { supabase, user, popupId };
}

export async function POST(request: Request) {
    const context = await getRequestContext(request);
    if ("error" in context) return context.error;
    const { error } = await context.supabase.from("saved_popups").upsert(
        { user_id: context.user.id, popup_id: context.popupId },
        { onConflict: "user_id,popup_id" }
    );
    if (error) {
        console.error("Could not save pop-up:", error);
        return Response.json({ error: "Could not save this pop-up." }, { status: 500 });
    }
    return Response.json({ saved: true });
}

export async function DELETE(request: Request) {
    const context = await getRequestContext(request);
    if ("error" in context) return context.error;
    const { error } = await context.supabase.from("saved_popups").delete()
        .eq("user_id", context.user.id)
        .eq("popup_id", context.popupId);
    if (error) {
        console.error("Could not remove saved pop-up:", error);
        return Response.json({ error: "Could not remove this pop-up." }, { status: 500 });
    }
    return Response.json({ saved: false });
}
