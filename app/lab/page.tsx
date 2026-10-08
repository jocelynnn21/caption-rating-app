import Link from "next/link";
import { redirect } from "next/navigation";
import DailyDropFeed from "@/components/DailyDropFeed";
import {
    addVoteSummary,
    getNewYorkDate,
    type DailyDrop,
} from "@/lib/daily-drops";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LabPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/lab");
    }

    const today = getNewYorkDate();

    const { data, error } = await supabase
        .from("ai_generations")
        .select(
            "id, creator_id, prompt, title, collaboration, concept, hook, neighborhood, category, model, created_at, votes(user_id, value)"
        )
        .eq("generated_on", today)
        .order("created_at", { ascending: false })
        .limit(5);

    const drops = ((data ?? []) as DailyDrop[]).map((drop) =>
        addVoteSummary(drop, user.id)
    );
    const { count } = await supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("generated_on", today);
    const remainingGenerations = Math.max(0, 5 - (count ?? 0));

    return (
        <main className="lab-page">
            <section className="lab-intro">
                <div>
                    <h1>Would you<br />show up?</h1>
                </div>
                <div className="lab-intro-copy">
                    <p>Five fictional pop-up ideas a day. Vote “I’d go” or “Skip.”</p>
                </div>
            </section>

            {error ? (
                <section className="lab-setup" aria-labelledby="lab-setup-title">
                    <h2 id="lab-setup-title">Daily Drop needs its database tables.</h2>
                    <p>
                        Run the included Supabase migration, then return here to reveal
                        the first concept.
                    </p>
                    <Link href="/">Return to Explore</Link>
                </section>
            ) : (
                <DailyDropFeed
                    initialDrops={drops}
                    isAuthenticated
                    initialRemainingGenerations={remainingGenerations}
                />
            )}
        </main>
    );
}
