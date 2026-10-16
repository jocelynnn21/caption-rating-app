import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyDrop = {
    id: string;
    creator_id: string;
    prompt: string;
    title: string;
    collaboration: string;
    concept: string;
    hook: string;
    neighborhood: string;
    category: string;
    model: string;
    daily_slot: number;
    created_at: string;
};

export type VoteSummary = {
    generation_id: string;
    go_count: number;
    skip_count: number;
};

export type UserVote = {
    generation_id: string;
    value: -1 | 1;
};

export type DropWithScore = DailyDrop & {
    goCount: number;
    skipCount: number;
    userVote: -1 | 0 | 1;
};

export function getNewYorkDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(
        parts.map(({ type, value }) => [type, value])
    );

    return `${values.year}-${values.month}-${values.day}`;
}

export function addVoteSummary(
    drop: DailyDrop,
    summary?: VoteSummary,
    userVote?: UserVote
): DropWithScore {
    return {
        ...drop,
        goCount: Number(summary?.go_count ?? 0),
        skipCount: Number(summary?.skip_count ?? 0),
        userVote: userVote?.value ?? 0,
    };
}

export async function addPrivateVoteData(
    supabase: SupabaseClient,
    drops: DailyDrop[]
): Promise<{ drops: DropWithScore[]; error: string | null }> {
    if (drops.length === 0) return { drops: [], error: null };

    const generationIds = drops.map((drop) => drop.id);
    const [summaryResult, ownVotesResult] = await Promise.all([
        supabase.rpc("get_vote_summaries", { generation_ids: generationIds }),
        supabase
            .from("votes")
            .select("generation_id, value")
            .in("generation_id", generationIds),
    ]);

    if (summaryResult.error || ownVotesResult.error) {
        return {
            drops: drops.map((drop) => addVoteSummary(drop)),
            error: summaryResult.error?.message ?? ownVotesResult.error?.message ??
                "Could not load vote data.",
        };
    }

    const summaries = (summaryResult.data ?? []) as VoteSummary[];
    const ownVotes = (ownVotesResult.data ?? []) as UserVote[];
    const summaryById = new Map(
        summaries.map((summary) => [summary.generation_id, summary])
    );
    const ownVoteById = new Map(
        ownVotes.map((vote) => [vote.generation_id, vote])
    );

    return {
        drops: drops.map((drop) =>
            addVoteSummary(
                drop,
                summaryById.get(drop.id),
                ownVoteById.get(drop.id)
            )
        ),
        error: null,
    };
}
