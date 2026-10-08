import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const generationId = body?.generationId;
    const value = body?.value;

    if (typeof generationId !== "string" || (value !== 1 && value !== -1)) {
        return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
    }

    const { error } = await supabase.from("votes").upsert(
        {
            generation_id: generationId,
            user_id: user.id,
            value,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "generation_id,user_id" }
    );

    if (error) {
        console.error("Could not save vote:", error);
        return NextResponse.json(
            { error: "Your vote could not be saved." },
            { status: 500 }
        );
    }

    const { data: votes, error: countError } = await supabase
        .from("votes")
        .select("value")
        .eq("generation_id", generationId);

    if (countError) {
        console.error("Could not count votes:", countError);
    }

    return NextResponse.json({
        goCount: votes?.filter((vote) => vote.value === 1).length ?? 0,
        skipCount: votes?.filter((vote) => vote.value === -1).length ?? 0,
    });
}
