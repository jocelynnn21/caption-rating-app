import LoginForm from "@/components/LoginForm";

type LoginPageProps = {
    searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
};

const destinations: Record<string, string> = {
    "/lab": "Daily Drop",
    "/saved": "Saved",
    "/profile": "your profile",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams;
    const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
    const next = requestedNext && destinations[requestedNext] ? requestedNext : "/";
    const destination = destinations[next] ?? "POPUP.NYC";
    const error = (Array.isArray(params.error) ? params.error[0] : params.error) === "oauth";

    return (
        <main className="min-h-[calc(100vh-68px)] bg-[#f7f6f2] text-black">
            <div className="mx-auto grid min-h-[calc(100vh-68px)] max-w-7xl px-6 py-16 md:grid-cols-2 md:px-10 md:py-24">
                <section className="flex flex-col justify-between border-b border-black pb-12 md:border-b-0 md:border-r md:pb-0 md:pr-16 lg:pr-24">
                    <div>
                        <h1 className="max-w-2xl text-[3.25rem] font-medium leading-[0.9] tracking-[-0.04em] md:text-7xl lg:text-8xl">
                            Keep New York close.
                        </h1>
                    </div>

                    <p className="mt-14 max-w-sm text-sm leading-6 text-neutral-600 md:mt-20 md:text-base md:leading-7">
                        Sign in to save real pop-ups and access the fictional ideas in
                        Daily Drop.
                    </p>
                </section>

                <section className="flex items-center py-12 md:py-0 md:pl-16 lg:pl-24">
                    <div className="w-full max-w-md">
                        <div className="mb-10 border-b border-neutral-400 pb-3">
                            <h2 className="text-xs font-semibold uppercase tracking-[0.18em]">
                                Sign in
                            </h2>
                        </div>

                        <p className="mb-8 text-3xl leading-tight tracking-[-0.035em] md:text-4xl">
                            Continue to {destination}.
                        </p>

                        {error && (
                            <p className="login-error" role="alert">
                                Google sign-in did not finish. Try again.
                            </p>
                        )}

                        <LoginForm next={next} />

                        <p className="mt-6 text-xs leading-5 text-neutral-600">
                            You’ll return to {destination} after sign-in.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}
