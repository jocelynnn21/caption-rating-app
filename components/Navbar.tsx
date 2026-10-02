import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AuthNav from "./AuthNav";

export default async function Navbar() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const isAuthenticated = Boolean(data?.claims?.sub);

    return (
        <header className="site-header">
            <div className="site-header-inner">
                <Link href="/" className="site-logo">
                    POPUP.NYC
                </Link>

                <AuthNav initialIsAuthenticated={isAuthenticated} />
            </div>
        </header>
    );
}
