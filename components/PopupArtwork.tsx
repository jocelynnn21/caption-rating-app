"use client";

import Image from "next/image";
import { useState } from "react";

type PopupArtworkProps = {
    imageUrl: string | null;
    displayName: string;
    neighborhood: string;
    dateLabel: string;
};

export default function PopupArtwork({
    imageUrl,
    displayName,
    neighborhood,
    dateLabel,
}: PopupArtworkProps) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    if (imageUrl && imageUrl !== failedUrl) {
        const optimizedSrc = `/api/popup-image?url=${encodeURIComponent(imageUrl)}`;
        return (
            <Image
                src={optimizedSrc}
                alt=""
                className="popup-image"
                fill
                sizes="(min-width: 1280px) 608px, (min-width: 768px) calc(50vw - 3rem), calc(100vw - 3rem)"
                onError={() => setFailedUrl(imageUrl)}
            />
        );
    }

    return (
        <div className="popup-generated-cover" aria-hidden="true">
            <span className="popup-cover-brand">POPUP.NYC</span>
            <strong>{displayName}</strong>
            <span className="popup-cover-meta">
                {neighborhood}<br />
                {dateLabel}
            </span>
            <span className="popup-cover-mark">NYC</span>
        </div>
    );
}
