import { NextResponse } from "next/server";
import {
    addPrivateVoteData,
    addVoteSummary,
    getNewYorkDate,
    type DailyDrop,
} from "@/lib/daily-drops";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
    brand: string;
    partner: string;
    title: string;
    concept: string;
    hook: string;
    category: string;
};

const allowedCategories = [
    "Art",
    "Beauty",
    "Books",
    "Culture",
    "Fashion",
    "Food",
    "Games",
    "Music",
] as const;

const sharedDropSelection =
    "id, creator_id, prompt, title, collaboration, concept, hook, neighborhood, category, model, daily_slot, created_at";

function shuffle<T>(items: T[]) {
    return [...items].sort(() => Math.random() - 0.5);
}

const wait = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds));

function normalizeText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return null;
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    return Array.from(normalized).slice(0, maxLength).join("");
}

function normalizeConcept(value: unknown): GeneratedConcept | null {
    if (!value || typeof value !== "object") return null;

    const record = value as Record<string, unknown>;
    const brand = normalizeText(record.brand, 60);
    const partner = normalizeText(record.partner, 80);
    const title = normalizeText(record.title, 80);
    const concept = normalizeText(record.concept, 220);
    const hook = normalizeText(record.hook, 80);
    const requestedCategory = normalizeText(record.category, 24);

    if (!brand || !partner || !title || !concept || !hook || !requestedCategory) {
        return null;
    }

    const category = allowedCategories.find(
        (item) => item.toLowerCase() === requestedCategory.toLowerCase()
    ) ?? "Culture";

    return { brand, partner, title, concept, hook, category };
}

function normalizeKey(value: string) {
    return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, " ").trim();
}

function getBrandFromCollaboration(collaboration: string) {
    return collaboration.split("×")[0]?.trim() ?? collaboration.trim();
}

function shiftIsoDate(date: string, days: number) {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}

async function generateConceptBatch(
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
            try {
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
                                    type: "ARRAY",
                                    minItems: 5,
                                    maxItems: 5,
                                    items: {
                                        type: "OBJECT",
                                        required: [
                                            "brand",
                                            "partner",
                                            "title",
                                            "concept",
                                            "hook",
                                            "category",
                                        ],
                                        properties: {
                                            brand: {
                                                type: "STRING",
                                                description: "One real consumer-facing brand.",
                                            },
                                            partner: {
                                                type: "STRING",
                                                description: "One real New York institution, local business, place, or cultural organization.",
                                            },
                                            title: {
                                                type: "STRING",
                                                description: "A plain, descriptive title, four words maximum.",
                                            },
                                            concept: {
                                                type: "STRING",
                                                description: "One short sentence saying exactly what visitors can do.",
                                            },
                                            hook: {
                                                type: "STRING",
                                                description: "A direct reason to visit, seven words maximum.",
                                            },
                                            category: {
                                                type: "STRING",
                                                description: "One familiar category such as Food, Games, Beauty, Books, Art, Fashion, or Music.",
                                            },
                                        },
                                    },
                                },
                            },
                        }),
                        signal: AbortSignal.timeout(15_000),
                    }
                );

                if (response.ok) {
                    return { response, model };
                }

                lastFailure = await response.text();
                const isTemporary = response.status === 429 || response.status === 503;

                if (!isTemporary) break;
            } catch (error) {
                lastFailure = error instanceof Error ? error.message : "Network request failed.";
            }

            await wait(400 * (attempt + 1));
        }
    }

    console.error("Gemini batch generation failed after retries:", lastFailure);
    return null;
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "Sign in to generate AI concepts." },
            { status: 401 }
        );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const requestedModel = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

    if (!apiKey) {
        return NextResponse.json(
            { error: "What If NYC needs a Gemini API key." },
            { status: 503 }
        );
    }

    await request.json().catch(() => null);
    const today = getNewYorkDate();
    const { data: existingRows, error: existingError } = await supabase
        .from("ai_generations")
        .select(sharedDropSelection)
        .eq("generated_on", today)
        .not("daily_slot", "is", null)
        .order("daily_slot", { ascending: true })
        .limit(5);

    if (existingError) {
        console.error("Could not check today’s shared concepts:", existingError);
        return NextResponse.json(
            { error: "Could not check today’s shared concepts." },
            { status: 500 }
        );
    }

    if (existingRows?.length === 5) {
        const voteData = await addPrivateVoteData(
            supabase,
            existingRows as DailyDrop[]
        );
        if (voteData.error) {
            console.error("Could not load private vote data:", voteData.error);
            return NextResponse.json(
                { error: "Could not load today’s vote data." },
                { status: 500 }
            );
        }
        const drops = voteData.drops;
        return NextResponse.json(
            {
                drop: drops[0],
                drops,
                created: false,
                message: "Today’s shared five were already generated.",
            },
            { status: 200 }
        );
    }

    if (existingRows && existingRows.length > 0) {
        return NextResponse.json(
            { error: "Today’s shared set is incomplete. Try again shortly." },
            { status: 409 }
        );
    }

    let admin;
    try {
        admin = createAdminClient();
    } catch (error) {
        console.error("AI generation is missing its Supabase server secret:", error);
        return NextResponse.json(
            { error: "AI generation is not configured." },
            { status: 503 }
        );
    }

    const recentSince = shiftIsoDate(today, -30);
    const { data: recentRows, error: recentError } = await supabase
        .from("ai_generations")
        .select("title, collaboration")
        .gte("generated_on", recentSince)
        .lt("generated_on", today)
        .not("daily_slot", "is", null)
        .order("generated_on", { ascending: false })
        .limit(100);

    if (recentError) {
        console.error("Could not load recent concepts for variety:", recentError);
    }

    const recentCollaborations = (recentRows ?? [])
        .map((row) => normalizeText(row.collaboration, 140))
        .filter((value): value is string => Boolean(value));
    const usedBrandKeys = new Set(
        recentCollaborations.map((value) =>
            normalizeKey(getBrandFromCollaboration(value))
        )
    );
    const usedCollaborationKeys = new Set(
        recentCollaborations.map(normalizeKey)
    );
    const selectedNeighborhoods = shuffle(neighborhoods).slice(0, 5);
    const selectedFormats = shuffle(formats).slice(0, 5);
    const brandsToAvoid = Array.from(usedBrandKeys).slice(0, 60).join(", ");
    const collaborationsToAvoid = recentCollaborations.slice(0, 40).join("; ");
    const slotBriefs = selectedNeighborhoods.map((neighborhood, index) =>
        `${index + 1}. ${neighborhood}: ${selectedFormats[index]}`
    ).join("\n");
    const prompt = `You are a senior experiential-marketing creative strategist. Create exactly five clearly fictional New York City pop-up concepts for POPUP.NYC, one for each numbered brief below and in the same order:\n${slotBriefs}\n\nEach concept must choose a different real consumer-facing brand and a different real New York institution, local business, place, or cultural organization as its partner. Choose surprising names that make strategic sense; do not default to the most famous global brands. The visitor action must be specific and understandable in five seconds, with a useful, collectible, edible, wearable, or memorable outcome. Avoid generic photo booths, product sampling, branded cafés, immersive rooms, vague installations, marketing jargon, metaphors, art criticism, prices, dates, and fabricated quotations. Do not use any recently used brand: ${brandsToAvoid || "none"}. Do not repeat these recent collaborations: ${collaborationsToAvoid || "none"}. Keep every title to four words, every hook to seven words, and every concept to one short sentence saying exactly what the visitor does. Return a JSON array of exactly five objects only.`;

    let acceptedBatch: { concepts: GeneratedConcept[]; model: string } | null = null;

    for (let semanticAttempt = 0; semanticAttempt < 2; semanticAttempt += 1) {
        const generation = await generateConceptBatch(apiKey, requestedModel, prompt);
        if (!generation) continue;

        const geminiData = (await generation.response.json()) as GeminiResponse;
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        let parsed: unknown;
        try {
            parsed = JSON.parse(rawText);
        } catch {
            console.error("Gemini returned invalid batch JSON.");
            continue;
        }

        if (!Array.isArray(parsed) || parsed.length !== 5) continue;
        const concepts = parsed.map(normalizeConcept);
        if (concepts.some((concept) => !concept)) continue;

        const normalized = concepts as GeneratedConcept[];
        const batchBrandKeys = normalized.map((concept) => normalizeKey(concept.brand));
        const batchPartnerKeys = normalized.map((concept) => normalizeKey(concept.partner));
        const batchCollaborationKeys = normalized.map((concept) =>
            normalizeKey(`${concept.brand} × ${concept.partner}`)
        );
        const isDistinct =
            new Set(batchBrandKeys).size === 5 &&
            new Set(batchPartnerKeys).size === 5 &&
            new Set(batchCollaborationKeys).size === 5;
        const repeatsRecent = batchBrandKeys.some((key) => usedBrandKeys.has(key)) ||
            batchCollaborationKeys.some((key) => usedCollaborationKeys.has(key));

        if (!isDistinct || repeatsRecent) continue;
        acceptedBatch = { concepts: normalized, model: generation.model };
        break;
    }

    if (!acceptedBatch) {
        return NextResponse.json(
            { error: "Gemini could not create five distinct brand ideas. Try again." },
            { status: 502 }
        );
    }

    const generatedRows = acceptedBatch.concepts.map((generated, index) => ({
        creator_id: user.id,
        generated_on: today,
        daily_slot: index + 1,
        prompt,
        title: generated.title,
        collaboration: `${generated.brand} × ${generated.partner}`,
        concept: generated.concept,
        hook: generated.hook,
        neighborhood: selectedNeighborhoods[index],
        category: generated.category,
        model: acceptedBatch.model,
    }));

    const { data: inserted, error } = await admin
        .from("ai_generations")
        .insert(generatedRows)
        .select(
            "id, creator_id, prompt, title, collaboration, concept, hook, neighborhood, category, model, daily_slot, created_at"
        );

    if (error || !inserted?.length) {
        console.error("Could not save generation:", error);

        if (error?.code === "23505") {
            const { data: winningRows } = await supabase
                .from("ai_generations")
                .select(sharedDropSelection)
                .eq("generated_on", today)
                .not("daily_slot", "is", null)
                .order("daily_slot", { ascending: true })
                .limit(5);

            if (winningRows?.length === 5) {
                const voteData = await addPrivateVoteData(
                    supabase,
                    winningRows as DailyDrop[]
                );
                if (voteData.error) {
                    console.error("Could not load private vote data:", voteData.error);
                    return NextResponse.json(
                        { error: "Could not load today’s vote data." },
                        { status: 500 }
                    );
                }
                const drops = voteData.drops;
                return NextResponse.json({
                    drop: drops[0],
                    drops,
                    created: false,
                    message: "Another member just generated today’s shared five.",
                });
            }

            return NextResponse.json(
                { error: "Today’s concepts could not be claimed. Try again." },
                { status: 409 }
            );
        }

        if (error?.code === "42501") {
            return NextResponse.json(
                {
                    error: "Supabase RLS blocked the save. Confirm the generation policies are installed.",
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
        addVoteSummary(drop as DailyDrop)
    );

    return NextResponse.json({
        drop: drops[0],
        drops,
        created: true,
        message: "Today’s shared five are ready to rate.",
    });
}
