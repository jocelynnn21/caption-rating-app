import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthCodeErrorPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) {
        redirect("/lab");
    }

    return (
        <main className="auth-error-page">
            <section>
                <p>Google sign-in was interrupted.</p>
                <h1>Let’s try that<br />one more time.</h1>
                <div>
                    <Link href="/login">Return to sign in</Link>
                    <Link href="/">Back to Explore</Link>
                </div>
            </section>
        </main>
    );
}
