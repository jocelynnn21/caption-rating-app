"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DropWithScore } from "@/lib/daily-drops";

type DailyDropFeedProps = {
    initialDrops: DropWithScore[];
    isAuthenticated: boolean;
    initialRemainingGenerations: number;
};

type GenerateResponse = {
    drop?: DropWithScore;
    drops?: DropWithScore[];
    error?: string;
};

export default function DailyDropFeed({
    initialDrops,
    isAuthenticated,
    initialRemainingGenerations,
}: DailyDropFeedProps) {
    const router = useRouter();
    const [drops, setDrops] = useState(initialDrops);
    const [activeIndex, setActiveIndex] = useState(0);
    const [voting, setVoting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState("");
    const [remainingGenerations, setRemainingGenerations] = useState(
        initialRemainingGenerations
    );

    const activeDrop = drops[activeIndex];
    const vote = async (value: -1 | 1) => {
        if (!activeDrop) return;
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        setVoting(true);
        setMessage("");

        const response = await fetch("/api/votes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ generationId: activeDrop.id, value }),
        });
        const result = await response.json();

        if (!response.ok) {
            setMessage(result.error ?? "Your vote could not be saved. Try again.");
            setVoting(false);
            return;
        }

        setDrops((current) =>
            current.map((drop) =>
                drop.id === activeDrop.id
                    ? {
                          ...drop,
                          goCount: result.goCount,
                          skipCount: result.skipCount,
                          userVote: value,
                      }
                : drop
            )
        );
        setVoting(false);
    };

    const revealDrop = async () => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        setGenerating(true);
        setMessage("");
        if (remainingGenerations === 0) {
            setMessage("You generated today’s five. Come back tomorrow for five more.");
            return;
        }

        const revealCount = remainingGenerations;
        const response = await fetch("/api/generations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ count: revealCount }),
        });
        const result = (await response.json()) as GenerateResponse;
        const revealed = result.drops ?? (result.drop ? [result.drop] : []);

        if (!response.ok || revealed.length === 0) {
            setMessage(result.error ?? "The next drop could not be revealed.");
            setGenerating(false);
            return;
        }

        setDrops((current) => {
            const revealedIds = new Set(revealed.map((drop) => drop.id));
            return [...revealed, ...current.filter((drop) => !revealedIds.has(drop.id))];
        });
        setRemainingGenerations((current) =>
            Math.max(0, current - revealed.length)
        );
        setActiveIndex(0);
        setMessage(
            revealed.length === 5
                ? "Today’s five are ready to rate."
                : `${revealed.length} new drops are ready to rate.`
        );
        setGenerating(false);
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
                <p>No concepts have dropped yet.</p>
                <h2>Reveal the first impossible idea for New York.</h2>
                {isAuthenticated ? (
                    <button type="button" onClick={revealDrop} disabled={generating}>
                        {generating
                            ? `Generating ${remainingGenerations}…`
                            : `Generate today’s ${remainingGenerations}`}
                    </button>
                ) : (
                    <Link href="/login">Sign in to reveal it</Link>
                )}
                {message && <p className="drop-status" role="status">{message}</p>}
            </section>
        );
    }

    return (
        <section className="drop-stage" aria-label="AI generated pop-up concepts">
            <article
                className="drop-feature"
                aria-label={`Fictional pop-up concept: ${activeDrop.title}`}
            >
                <p className="drop-fiction-label">Fictional concept</p>
                <div className="drop-poster" aria-hidden="true">
                    <span className="drop-poster-category">{activeDrop.category}</span>
                    <strong>{activeDrop.collaboration}</strong>
                    <span className="drop-poster-place">{activeDrop.neighborhood}</span>
                </div>

                <div className="drop-story">
                    <h2>{activeDrop.title}</h2>
                    <p className="drop-concept">{activeDrop.concept}</p>

                    <div className="drop-vote-group" aria-label="Vote on this concept">
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

                    {!isAuthenticated && (
                        <p className="drop-signin-note">
                            <Link href="/login">Sign in</Link> to cast your vote.
                        </p>
                    )}

                    {activeDrop.userVote !== 0 && (
                        <p
                            className="drop-status drop-vote-status"
                            role="status"
                        >
                            Vote saved
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

            <div className="drop-controls">
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
                    <span>{activeIndex + 1} / {drops.length}</span>
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

                <div className="drop-reveal-control">
                    {remainingGenerations > 0 ? (
                        <>
                            <p>{remainingGenerations} of today’s 5 left.</p>
                            <button
                                type="button"
                                onClick={revealDrop}
                                disabled={generating}
                            >
                                {generating
                                    ? "Generating ideas…"
                                    : `Generate ${remainingGenerations}`}
                            </button>
                        </>
                    ) : (
                        <p className="drop-return-message">
                            Five new ideas tomorrow.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
