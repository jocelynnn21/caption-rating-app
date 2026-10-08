import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/saved");
    }

    return (
        <main className="min-h-screen bg-[#f7f6f2] text-black">
            <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
                <header className="border-b border-black pb-10 md:pb-14">
                    <div className="mb-5 flex items-end justify-between">
                        <p className="text-xs font-medium uppercase tracking-[0.22em]">
                            Your collection
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                            00 Saved
                        </p>
                    </div>
                    <h1 className="text-6xl font-medium leading-none tracking-[-0.055em] md:text-8xl">
                        Saved pop-ups
                    </h1>
                </header>

                <section className="grid min-h-[420px] items-center border-b border-black py-16 md:grid-cols-2 md:gap-20 md:py-24">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                        Nothing here yet / 00
                    </p>

                    <div className="mt-10 max-w-lg md:mt-0">
                        <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.04em] md:text-5xl">
                            Start building your New York list.
                        </h2>
                        <p className="mt-6 max-w-md text-sm leading-6 text-neutral-600 md:text-base md:leading-7">
                            Explore what is happening across the city and save the
                            pop-ups you want to visit.
                        </p>
                        <Link
                            href="/"
                            className="mt-9 inline-block border-b border-black pb-1 text-xs font-semibold uppercase tracking-[0.15em] transition-opacity hover:opacity-50"
                        >
                            Explore pop-ups →
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
