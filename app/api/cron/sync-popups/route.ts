import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getNewYorkDate } from "@/lib/daily-drops";
import { scrapePopupSources } from "@/lib/popup-scrapers";

export const maxDuration = 60;

export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error("CRON_SECRET is not configured.");
        return NextResponse.json({ error: "Sync is not configured." }, { status: 503 });
    }

    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecret =
        process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseSecret) {
        console.error("Popup sync is missing its Supabase server secret.");
        return NextResponse.json({ error: "Sync is not configured." }, { status: 503 });
    }

    const today = getNewYorkDate();

    try {
        const events = await scrapePopupSources(today);

        if (events.length === 0) {
            throw new Error("No current popup listings passed scraper validation.");
        }

        const admin = createClient(supabaseUrl, supabaseSecret, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error: upsertError } = await admin
            .from("popups")
            .upsert(events, { onConflict: "source_key" });

        if (upsertError) {
            throw new Error(`Supabase upsert failed: ${upsertError.message}`);
        }

        const { error: archiveError } = await admin
            .from("popups")
            .update({ is_active: false })
            .in("source_provider", ["nycforfree", "vipsamplesale"])
            .lt("end_date", today);

        if (archiveError) {
            throw new Error(`Supabase archive failed: ${archiveError.message}`);
        }

        revalidatePath("/");
        console.info("Popup sync completed.", {
            scraped: events.length,
            sources: [...new Set(events.map((event) => event.source_provider))],
        });

        return NextResponse.json({
            ok: true,
            synced: events.length,
            sources: [...new Set(events.map((event) => event.source_provider))],
        });
    } catch (error) {
        console.error("Popup sync failed:", error);
        return NextResponse.json(
            { error: "Popup sync failed. Check the function logs." },
            { status: 502 }
        );
    }
}
