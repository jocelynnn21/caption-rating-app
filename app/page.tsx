import { createClient } from '@supabase/supabase-js'

export default async function Page() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )

    const { data, error } = await supabase
        .from('messages')
        .select('id, text')
        .limit(10)

    if (error) {
        return <p>Error: {error.message}</p>
    }

    return (
        <main className="min-h-screen bg-gray-50 px-6 py-16">
            <div className="mx-auto max-w-2xl">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">
                    Messages
                </h1>

                <p className="mb-8 text-gray-500">
                    Messages fetched from Supabase
                </p>

                <div className="space-y-4">
                    {data?.map((row) => (
                        <div
                            key={row.id}
                            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                            <p className="text-lg text-gray-800">
                                {row.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}