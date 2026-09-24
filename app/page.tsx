import { createClient } from "@supabase/supabase-js";

export default async function Page() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: popups, error } = await supabase
        .from("popups")
        .select("*")
        .order("start_date", { ascending: true });

    if (error) {
        return (
            <main className="p-10">
                <p>Error: {error.message}</p>
            </main>
        );
    }

    const formatDate = (date: string) => {
        return new Date(date + "T00:00:00")
            .toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            })
            .toUpperCase();
    };

    return (
        <main className="min-h-screen bg-[#f7f6f2] text-black">

            {/* NAV */}
            <nav className="border-b border-black">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
                    <h1 className="text-xl font-bold tracking-tight">
                        POPUP.NYC
                    </h1>

                    <p className="text-xs uppercase tracking-[0.2em]">
                        New York / 2026
                    </p>
                </div>
            </nav>


            {/* HERO */}
            <section className="mx-auto max-w-7xl px-6 pb-20 pt-20 md:px-10 md:pb-28 md:pt-28">

                <p className="mb-8 text-xs uppercase tracking-[0.25em]">
                    The city's temporary guide
                </p>

                <h2 className="max-w-5xl text-6xl font-medium leading-[0.9] tracking-[-0.05em] md:text-8xl lg:text-9xl">
                    What&apos;s popping
                    <br />
                    in New York?
                </h2>

                <div className="mt-12 flex justify-end">
                    <p className="max-w-md text-base leading-7 text-neutral-600 md:text-lg">
                        A curated guide to limited-time stores, brand experiences,
                        installations, and events happening across New York City.
                    </p>
                </div>

            </section>


            {/* CATEGORY NAV */}
            <section className="border-y border-black">
                <div className="mx-auto flex max-w-7xl gap-8 overflow-x-auto px-6 py-5 md:px-10">

                    {[
                        "All",
                        "Fashion",
                        "Beauty",
                        "Food & Drink",
                        "Music",
                        "Art",
                    ].map((category) => (
                        <button
                            key={category}
                            className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em] transition-opacity hover:opacity-50"
                        >
                            {category}
                        </button>
                    ))}

                </div>
            </section>


            {/* EVENTS */}
            <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">

                <div className="mb-10 flex items-end justify-between border-b border-black pb-4">

                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
                        Currently in NYC
                    </h3>

                    <p className="text-xs uppercase tracking-[0.15em]">
                        {String(popups?.length || 0).padStart(2, "0")} Events
                    </p>

                </div>


                {/* EVENT GRID */}
                <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2">

                    {popups?.map((popup, index) => (

                        <article key={popup.id} className="group">

                            {/* IMAGE */}
                            <div className="relative mb-6 aspect-[4/3] overflow-hidden bg-neutral-200">

                                {popup.image_url ? (
                                    <img
                                        src={popup.image_url}
                                        alt={popup.name}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                      Image coming soon
                    </span>
                                    </div>
                                )}

                                <span className="absolute left-4 top-4 bg-[#f7f6f2] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.2em]">
                  {popup.category}
                </span>

                            </div>


                            {/* EVENT NUMBER + CATEGORY */}
                            <div className="mb-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">

                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>

                                <span>
                  {popup.category}
                </span>

                            </div>


                            {/* TITLE */}
                            <h4 className="text-3xl font-medium leading-tight tracking-[-0.03em] md:text-4xl">
                                {popup.name}
                            </h4>


                            {/* EVENT INFO */}
                            <div className="mt-6 grid grid-cols-2 border-t border-neutral-400 pt-4 text-xs uppercase tracking-[0.12em]">

                                <div>
                                    <p className="mb-1 text-neutral-500">
                                        Location
                                    </p>

                                    <p>
                                        {popup.neighborhood}
                                    </p>
                                </div>


                                <div>
                                    <p className="mb-1 text-neutral-500">
                                        Dates
                                    </p>

                                    <p>
                                        {formatDate(popup.start_date)}
                                        {" — "}
                                        {formatDate(popup.end_date)}
                                    </p>
                                </div>

                            </div>


                            {/* LINK */}
                            {popup.source_url && (
                                <a
                                    href={popup.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-6 inline-block border-b border-black pb-1 text-xs font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-50"
                                >
                                    View Event ↗
                                </a>
                            )}

                        </article>

                    ))}

                </div>


                {/* EMPTY STATE */}
                {popups?.length === 0 && (
                    <div className="py-24 text-center">
                        <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                            No upcoming events
                        </p>
                    </div>
                )}

            </section>


            {/* FOOTER */}
            <footer className="mt-20 border-t border-black">

                <div className="mx-auto flex max-w-7xl justify-between px-6 py-8 text-[10px] uppercase tracking-[0.18em] md:px-10">

          <span>
            POPUP.NYC
          </span>

                    <span>
            New York City
          </span>

                </div>

            </footer>

        </main>
    );
}