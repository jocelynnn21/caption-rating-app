import Link from "next/link";
import { redirect } from "next/navigation";
import PopupCard from "@/components/PopupCard";
import { getNewYorkDate } from "@/lib/daily-drops";
import type { Popup } from "@/lib/popups";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?next=/saved");

    const { data: savedRows, error: savedError } = await supabase
        .from("saved_popups")
        .select("popup_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const popupIds = savedRows?.map((row) => row.popup_id) ?? [];
    let popups: Popup[] = [];
    let popupLoadFailed = false;

    if (popupIds.length > 0) {
        const { data, error } = await supabase
            .from("popups")
            .select("id, name, category, neighborhood, start_date, end_date, source_url, image_url, source_title, source_provider, last_verified_at")
            .in("id", popupIds);
        popupLoadFailed = Boolean(error);
        const popupMap = new Map((data as Popup[] | null)?.map((popup) => [popup.id, popup]));
        popups = popupIds.flatMap((id) => {
            const popup = popupMap.get(id);
            return popup ? [popup] : [];
        });
    }

    const today = getNewYorkDate();

    return (
        <main className="min-h-screen bg-[#f7f6f2] text-black">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
                <header className="border-b border-black pb-10 md:pb-14">
                    <div className="mb-5 flex items-end justify-between">
                        <p className="text-xs font-medium uppercase tracking-[0.22em]">Your collection</p>
                        <p className="tabular-nums text-xs uppercase tracking-[0.16em] text-neutral-500">
                            {String(popups.length).padStart(2, "0")} Saved
                        </p>
                    </div>
                    <h1 className="text-[3.25rem] font-medium leading-none tracking-[-0.04em] md:text-8xl">Saved pop-ups</h1>
                </header>

                {savedError || popupLoadFailed ? (
                    <section className="saved-empty-state" role="status">
                        <p>Saved pop-ups are temporarily unavailable.</p>
                        <Link href="/saved">Try again</Link>
                    </section>
                ) : popups.length > 0 ? (
                    <section className="grid grid-cols-1 gap-x-8 gap-y-16 py-16 md:grid-cols-2 md:py-24">
                        {popups.map((popup, index) => (
                            <PopupCard
                                key={popup.id}
                                popup={popup}
                                index={index}
                                today={today}
                                isSaved
                                isAuthenticated
                            />
                        ))}
                    </section>
                ) : (
                    <section className="saved-empty-state">
                        <p>Nothing saved yet.</p>
                        <h2>Keep the places you want to visit.</h2>
                        <Link href="/">Explore pop-ups <span aria-hidden="true">→</span></Link>
                    </section>
                )}
            </div>
        </main>
    );
}
