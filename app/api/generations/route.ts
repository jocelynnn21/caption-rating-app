import { NextResponse } from "next/server";
import {
    addVoteSummary,
    getNewYorkDate,
    type DailyDrop,
} from "@/lib/daily-drops";
import { createClient } from "@/lib/supabase/server";

const pairings = [
    ["A24", "New York Public Library"],
    ["LEGO", "Katz’s Delicatessen"],
    ["Glossier", "MTA"],
    ["Trader Joe’s", "MoMA PS1"],
    ["Nintendo", "The Strand"],
    ["Carhartt", "Russ & Daughters"],
    ["Muji", "Coney Island"],
    ["Spotify", "Brooklyn Botanic Garden"],
];

const neighborhoods = [
    "SoHo",
    "Lower East Side",
    "Williamsburg",
    "Chinatown",
    "Harlem",
    "Long Island City",
    "East Village",
    "Bushwick",
];

const formats = [
    "a one-night-only after-hours experience",
    "an interactive installation with a useful takeaway",
    "a tiny storefront transformed for one weekend",
    "a participatory food-and-design experiment",
    "a limited-edition neighborhood clubhouse",
    "a playful public workshop",
];

type GeminiResponse = {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
    }>;
};

type GeneratedConcept = {
    title: string;
    collaboration: string;
    concept: string;
    hook: string;
    neighborhood: string;
    category: string;
};

function pick<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)];
}

const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

async function generateConcept(
    apiKey: string,
    requestedModel: string,
    prompt: string
) {
    const models = Array.from(
        new Set([requestedModel, "gemini-3.5-flash-lite"])
    );
    let lastFailure = "No Gemini model was available.";

    for (const model of models) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey,
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: "OBJECT",
                                required: [
                                    "title",
                                    "collaboration",
                                    "concept",
                                    "hook",
                                    "neighborhood",
                                    "category",
                                ],
                                properties: {
                                    title: {
                                        type: "STRING",
                                        description: "A plain, descriptive title, four words maximum.",
                                    },
                                    collaboration: {
                                        type: "STRING",
                                        description: "The two names joined with ×.",
                                    },
                                    concept: {
                                        type: "STRING",
                                        description: "One short sentence saying exactly what visitors can do.",
                                    },
                                    hook: {
                                        type: "STRING",
                                        description: "A direct reason to visit, seven words maximum.",
                                    },
                                    neighborhood: { type: "STRING" },
                                    category: {
                                        type: "STRING",
                                        description: "One familiar category such as Food, Games, Beauty, Books, Art, Fashion, or Music.",
                                    },
                                },
                            },
                        },
                    }),
                }
            );

            if (response.ok) {
                return { response, model };
            }

            lastFailure = await response.text();
            const isTemporary = response.status === 429 || response.status === 503;

            if (!isTemporary) break;
            await wait(400 * (attempt + 1));
        }
    }

    console.error("Gemini generation failed after retries:", lastFailure);
    return null;
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Sign in to reveal a Daily Drop." },
            { status: 401 }
        );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const requestedModel = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

    if (!apiKey) {
        return NextResponse.json(
            { error: "Daily Drop is waiting for its Gemini API key." },
            { status: 503 }
        );
    }

    const body = await request.json().catch(() => null);
    const today = getNewYorkDate();
    const { count: generatedToday, error: countError } = await supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user.id)
        .eq("generated_on", today);

    if (countError) {
        console.error("Could not check the daily generation count:", countError);
        return NextResponse.json(
            { error: "Could not check today’s generation limit." },
            { status: 500 }
        );
    }

    const remaining = Math.max(0, 5 - (generatedToday ?? 0));
    if (remaining === 0) {
        return NextResponse.json(
            { error: "You generated today’s five. Come back tomorrow." },
            { status: 429 }
        );
    }

    const requestedCount = body?.count === 5 ? 5 : 1;
    const count = Math.min(requestedCount, remaining);
    const selectedPairings = [...pairings]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);
    const generatedRows = [];

    for (const pairing of selectedPairings) {
        const neighborhood = pick(neighborhoods);
        const format = pick(formats);
        const prompt = `Create a clearly fictional New York City pop-up concept for POPUP.NYC. Combine ${pairing[0]} with ${pairing[1]} in ${neighborhood} as ${format}. Write in plain English that a college student can understand in five seconds. The concept must be one short sentence explaining exactly what a visitor does. Use no metaphors, jargon, art criticism, abstract language, prices, dates, or fabricated quotations. Keep the title and hook short. Return concise JSON only.`;
        const generation = await generateConcept(apiKey, requestedModel, prompt);

        if (!generation) {
            return NextResponse.json(
                { error: "The city’s imagination is taking a break. Try again." },
                { status: 502 }
            );
        }

        const geminiData = (await generation.response.json()) as GeminiResponse;
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
            return NextResponse.json(
                { error: "Gemini returned an empty concept. Try again." },
                { status: 502 }
            );
        }

        let generated: GeneratedConcept;
        try {
            generated = JSON.parse(rawText) as GeneratedConcept;
        } catch {
            console.error("Gemini returned invalid JSON:", rawText);
            return NextResponse.json(
                { error: "The concept arrived in an unexpected format. Try again." },
                { status: 502 }
            );
        }

        generatedRows.push({
            creator_id: user.id,
            generated_on: today,
            prompt,
            title: generated.title,
            collaboration: `${pairing[0]} × ${pairing[1]}`,
            concept: generated.concept,
            hook: generated.hook,
            neighborhood,
            category: generated.category,
            model: generation.model,
        });
    }

    const { data: inserted, error } = await supabase
        .from("ai_generations")
        .insert(generatedRows)
        .select(
            "id, creator_id, prompt, title, collaboration, concept, hook, neighborhood, category, model, created_at"
        );

    if (error || !inserted?.length) {
        console.error("Could not save generation:", error);

        if (error?.code === "23505") {
            return NextResponse.json(
                {
                    error: "The database still has the old one-drop-per-day limit. Run the latest Supabase migration once, then try again.",
                },
                { status: 409 }
            );
        }

        if (error?.code === "42501") {
            return NextResponse.json(
                {
                    error: "Supabase RLS blocked the save. Confirm the Daily Drop policies are installed.",
                },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "The concept was generated but could not be saved." },
            { status: 500 }
        );
    }

    const drops = inserted.map((drop) =>
        addVoteSummary({ ...drop, votes: [] } as DailyDrop, user.id)
    );

    return NextResponse.json({
        drop: drops[0],
        drops,
        created: true,
    });
}
