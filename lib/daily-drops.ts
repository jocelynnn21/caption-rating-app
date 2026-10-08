export type Vote = {
    user_id: string;
    value: -1 | 1;
};

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
    created_at: string;
    votes: Vote[];
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
    currentUserId: string | null
): DropWithScore {
    return {
        ...drop,
        goCount: drop.votes.filter((vote) => vote.value === 1).length,
        skipCount: drop.votes.filter((vote) => vote.value === -1).length,
        userVote:
            drop.votes.find((vote) => vote.user_id === currentUserId)?.value ?? 0,
    };
}
