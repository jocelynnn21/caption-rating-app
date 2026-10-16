"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DropWithScore } from "@/lib/daily-drops";

type DailyDropFeedProps = {
    initialDrops: DropWithScore[];
    isAuthenticated: boolean;
    initialCanGenerate: boolean;
};

type GenerateResponse = {
    drop?: DropWithScore;
    drops?: DropWithScore[];
    error?: string;
    message?: string;
};

export default function DailyDropFeed({
    initialDrops,
    isAuthenticated,
    initialCanGenerate,
}: DailyDropFeedProps) {
    const router = useRouter();
    const [drops, setDrops] = useState(initialDrops);
    const [activeIndex, setActiveIndex] = useState(0);
    const [voting, setVoting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState("");
    const [canGenerate, setCanGenerate] = useState(initialCanGenerate);

    const activeDrop = drops[activeIndex];
    const vote = async (value: -1 | 1) => {
        if (!activeDrop || voting) return;
        if (!isAuthenticated) {
            router.push("/login?next=/lab");
            return;
        }

        setVoting(true);
        setMessage("");

        try {
            const response = await fetch("/api/votes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ generationId: activeDrop.id, value }),
            });
            const result = await response.json().catch(() => ({}));

            if (response.status === 401) {
                router.push("/login?next=/lab");
                return;
            }

            if (!response.ok) {
                setMessage(result.error ?? "Your vote could not be saved. Try again.");
                return;
            }

            setDrops((current) => current.map((drop) => {
                if (drop.id !== activeDrop.id) return drop;

                const previousVote = drop.userVote;
                const fallbackGoCount = Math.max(
                    0,
                    drop.goCount + (value === 1 ? 1 : 0) - (previousVote === 1 ? 1 : 0)
                );
                const fallbackSkipCount = Math.max(
                    0,
                    drop.skipCount + (value === -1 ? 1 : 0) - (previousVote === -1 ? 1 : 0)
                );

                return {
                    ...drop,
                    goCount: typeof result.goCount === "number"
                        ? result.goCount
                        : fallbackGoCount,
                    skipCount: typeof result.skipCount === "number"
                        ? result.skipCount
                        : fallbackSkipCount,
                    userVote: value,
                };
            }));
        } catch {
            setMessage("You appear to be offline. Reconnect and try your vote again.");
        } finally {
            setVoting(false);
        }
    };

    const revealDrop = async () => {
        if (generating) return;
        if (!isAuthenticated) {
            router.push("/login?next=/lab");
            return;
        }

        setMessage("");
        if (!canGenerate) {
            setMessage("Today’s five are already ready to rate.");
            return;
        }
        setGenerating(true);

        try {
            const response = await fetch("/api/generations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const result = (await response.json().catch(() => ({}))) as GenerateResponse;
            const revealed = result.drops ?? (result.drop ? [result.drop] : []);

            if (response.status === 401) {
                router.push("/login?next=/lab");
                return;
            }

            if (!response.ok || revealed.length === 0) {
                setMessage(result.error ?? "The concepts could not be generated. Try again.");
                return;
            }

            setDrops((current) => {
                const revealedIds = new Set(revealed.map((drop) => drop.id));
                return [...revealed, ...current.filter((drop) => !revealedIds.has(drop.id))];
            });
            setCanGenerate(false);
            setActiveIndex(0);
            setMessage(
                result.message ?? "Today’s shared five are ready to rate."
            );
        } catch {
            setMessage("You appear to be offline. Reconnect and generate again.");
        } finally {
            setGenerating(false);
        }
    };

    const move = (direction: -1 | 1) => {
        if (drops.length < 2) return;
        setMessage("");
        setActiveIndex((current) =>
            Math.min(Math.max(current + direction, 0), drops.length - 1)
        );
    };

    if (!activeDrop) {
        return (
            <section className="drop-empty">
                <p>Today’s shared set is waiting.</p>
                <h2>Generate five new what-ifs for New York.</h2>
                {isAuthenticated ? (
                    <button type="button" onClick={revealDrop} disabled={generating}>
                        {generating ? "Generating five ideas…" : "Generate today’s five"}
                    </button>
                ) : (
                    <Link href="/login?next=/lab">Sign in to reveal it</Link>
                )}
                {message && <p className="drop-status" role="status">{message}</p>}
            </section>
        );
    }

    return (
        <section className="drop-stage" aria-label="AI-generated pop-up concepts">
            <nav className="drop-toolbar" aria-label="Browse concepts">
                <p>
                    Concept <span>{String(activeIndex + 1).padStart(2, "0")}</span>
                    <span aria-hidden="true"> / </span>
                    <span>{String(drops.length).padStart(2, "0")}</span>
                </p>
                <div className="drop-browse-controls">
                    <button
                        className="drop-arrow-button"
                        type="button"
                        onClick={() => move(-1)}
                        disabled={activeIndex === 0}
                        aria-label="Previous concept"
                    >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M16 10H4M9 5l-5 5 5 5" />
                        </svg>
                    </button>
                    <button
                        className="drop-arrow-button"
                        type="button"
                        onClick={() => move(1)}
                        disabled={activeIndex === drops.length - 1}
                        aria-label="Next concept"
                    >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M4 10h12M11 5l5 5-5 5" />
                        </svg>
                    </button>
                </div>
            </nav>

            <article
                className="drop-feature"
                aria-label={`Fictional pop-up concept: ${activeDrop.title}`}
            >
                <div className="drop-poster" aria-hidden="true">
                    <div className="drop-poster-head">
                        <span className="drop-poster-category">{activeDrop.category}</span>
                        <span className="drop-fiction-label">Fictional concept</span>
                    </div>
                    <strong>{activeDrop.collaboration}</strong>
                    <span className="drop-poster-place">{activeDrop.neighborhood}</span>
                </div>

                <div className="drop-story">
                    <h2>{activeDrop.title}</h2>
                    <p className="drop-concept">{activeDrop.concept}</p>

                    <div
                        className="drop-vote-group"
                        aria-label="Vote on this concept"
                        aria-busy={voting}
                    >
                        <button
                            type="button"
                            onClick={() => vote(1)}
                            disabled={voting}
                            aria-pressed={activeDrop.userVote === 1}
                        >
                            <span>I’d go</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => vote(-1)}
                            disabled={voting}
                            aria-pressed={activeDrop.userVote === -1}
                        >
                            <span>Skip</span>
                        </button>
                    </div>

                    <span className="sr-only" role="status" aria-live="polite">
                        {voting ? "Saving your vote…" : ""}
                    </span>

                    {!isAuthenticated && (
                        <p className="drop-signin-note">
                            <Link href="/login?next=/lab">Sign in</Link> to cast your vote.
                        </p>
                    )}

                    {activeDrop.userVote !== 0 && (
                        <p
                            className="drop-status drop-vote-status"
                            role="status"
                        >
                            Vote saved · {Math.round(
                                (activeDrop.goCount /
                                    Math.max(1, activeDrop.goCount + activeDrop.skipCount)) * 100
                            )}% of users would go
                        </p>
                    )}

                    {message && (
                        <p
                            className="drop-status"
                            role="status"
                            aria-live="polite"
                        >
                            {message}
                        </p>
                    )}
                </div>
            </article>

            <div className="drop-generation-strip">
                <div>
                    <strong>Today’s shared concepts</strong>
                    <p>Five ideas · New set tomorrow</p>
                </div>
            </div>
        </section>
    );
}
