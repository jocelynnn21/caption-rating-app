import Link from "next/link";
import PopupCard from "@/components/PopupCard";
import { getNewYorkDate } from "@/lib/daily-drops";
import { isPopupCategory, POPUP_CATEGORIES, type Popup } from "@/lib/popups";
import { createClient } from "@/lib/supabase/server";

type ExplorePageProps = {
    searchParams: Promise<{ category?: string | string[] }>;
};

export default async function Page({ searchParams }: ExplorePageProps) {
    const params = await searchParams;
    const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
    const activeCategory = requestedCategory && isPopupCategory(requestedCategory)
        ? requestedCategory
        : "All";
    const supabase = await createClient();
    const today = getNewYorkDate();

    let popupQuery = supabase
        .from("popups")
        .select("id, name, category, neighborhood, start_date, end_date, source_url, image_url, source_title, source_provider, last_verified_at")
        .gte("end_date", today)
        .order("start_date", { ascending: true });
    if (activeCategory !== "All") popupQuery = popupQuery.eq("category", activeCategory);

    const [popupResult, userResult] = await Promise.all([popupQuery, supabase.auth.getUser()]);
    const popups = (popupResult.data ?? []) as Popup[];
    const happeningCount = popups.filter(
        (popup) => popup.start_date <= today && popup.end_date >= today
    ).length;
    const user = userResult.data.user;
    let savedIds = new Set<number>();

    if (user && popups.length > 0) {
        const { data: savedRows } = await supabase
            .from("saved_popups")
            .select("popup_id")
            .eq("user_id", user.id)
            .in("popup_id", popups.map((popup) => popup.id));
        savedIds = new Set(savedRows?.map((row) => row.popup_id) ?? []);
    }

    return (
        <main className="min-h-screen bg-[#f7f6f2] text-black">
            <section className="mx-auto max-w-7xl px-6 pb-16 pt-16 md:px-10 md:pb-20 md:pt-20">
                <p className="mb-8 text-xs uppercase tracking-[0.25em]">The city&apos;s temporary guide</p>
                <h1 className="max-w-5xl text-[3.25rem] font-medium leading-[0.9] tracking-[-0.04em] md:text-8xl lg:text-9xl">
                    What&apos;s popping<br />in New York?
                </h1>
                <div className="mt-10 flex flex-col items-start gap-5 md:flex-row md:items-end md:justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                        {happeningCount} happening now
                    </p>
                    <p className="max-w-md text-base leading-7 text-neutral-600 md:text-lg">
                        Limited-time stores, brand experiences, installations, and events across New York City.
                    </p>
                </div>
            </section>

            <nav className="border-y border-black" aria-label="Filter pop-ups by category">
                <div className="popup-filter-list mx-auto flex max-w-7xl gap-8 overflow-x-auto px-6 py-5 md:px-10">
                    {POPUP_CATEGORIES.map((category) => (
                        <Link
                            key={category}
                            href={category === "All" ? "/" : `/?category=${encodeURIComponent(category)}`}
                            aria-current={category === activeCategory ? "page" : undefined}
                            className="popup-filter-link"
                        >
                            {category}
                        </Link>
                    ))}
                </div>
            </nav>

            <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
                <div className="mb-10 flex items-end justify-between border-b border-black pb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">
                        {activeCategory === "All" ? "Current in NYC" : activeCategory}
                    </h2>
                    <p className="tabular-nums text-xs uppercase tracking-[0.15em]">{String(popups.length).padStart(2, "0")} Events</p>
                </div>

                <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">
                    {popups.map((popup, index) => (
                        <PopupCard
                            key={popup.id}
                            popup={popup}
                            index={index}
                            today={today}
                            isSaved={savedIds.has(popup.id)}
                            isAuthenticated={Boolean(user)}
                        />
                    ))}
                </div>

                {popupResult.error && (
                    <div className="popup-empty-state" role="status">
                        <p>Listings are temporarily unavailable.</p>
                        <Link href={activeCategory === "All" ? "/" : `/?category=${encodeURIComponent(activeCategory)}`}>Try again</Link>
                    </div>
                )}
                {!popupResult.error && popups.length === 0 && (
                    <div className="popup-empty-state">
                        <p>No current {activeCategory === "All" ? "" : `${activeCategory.toLowerCase()} `}pop-ups.</p>
                        {activeCategory !== "All" && <Link href="/">View all events</Link>}
                    </div>
                )}
            </section>

            <footer className="mt-20 border-t border-black">
                <div className="mx-auto flex max-w-7xl justify-end px-6 py-8 text-[10px] uppercase tracking-[0.18em] md:px-10">
                    <span>New York City</span>
                </div>
            </footer>
        </main>
    );
}
