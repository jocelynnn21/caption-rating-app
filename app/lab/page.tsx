import Link from "next/link";
import { redirect } from "next/navigation";
import DailyDropFeed from "@/components/DailyDropFeed";
import {
    addPrivateVoteData,
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
            "id, creator_id, prompt, title, collaboration, concept, hook, neighborhood, category, model, daily_slot, created_at"
        )
        .eq("generated_on", today)
        .not("daily_slot", "is", null)
        .order("daily_slot", { ascending: true })
        .limit(5);

    const voteData = await addPrivateVoteData(
        supabase,
        (data ?? []) as DailyDrop[]
    );
    const drops = voteData.drops;
    const hasIncompleteSet = drops.length > 0 && drops.length < 5;

    return (
        <main className="lab-page">
            <section className="lab-intro">
                <div>
                    <h1>The next pop-up starts as a what if.</h1>
                    <p className="lab-intro-copy">
                        AI-generated brand concepts, rated by people who would actually go.
                    </p>
                </div>
            </section>

            {error || voteData.error || hasIncompleteSet ? (
                <section className="lab-setup" aria-labelledby="lab-setup-title">
                    <h2 id="lab-setup-title">Today’s concepts aren’t available.</h2>
                    <p>
                        {hasIncompleteSet
                            ? "The shared set did not finish loading. Try again shortly."
                            : "We couldn’t reach the concept archive. Refresh this page to try again."}
                    </p>
                    <div className="lab-setup-actions">
                        <Link href="/lab">Try again</Link>
                        <Link href="/">Return to Explore</Link>
                    </div>
                </section>
            ) : (
                <DailyDropFeed
                    initialDrops={drops}
                    isAuthenticated
                    initialCanGenerate={drops.length === 0}
                />
            )}
        </main>
    );
}
