export type Popup = {
    id: number;
    name: string;
    category: string;
    neighborhood: string;
    start_date: string;
    end_date: string;
    source_url: string | null;
    image_url: string | null;
    source_title: string | null;
    source_provider: string | null;
    last_verified_at: string | null;
};

export const POPUP_CATEGORIES = [
    "All",
    "Fashion",
    "Beauty",
    "Food & Drink",
    "Music",
    "Art",
] as const;

export type PopupCategory = (typeof POPUP_CATEGORIES)[number];

export function isPopupCategory(value: string): value is PopupCategory {
    return POPUP_CATEGORIES.some((category) => category === value);
}

export function formatPopupDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
    });
}

export function getPopupTiming(popup: Popup, today: string) {
    if (popup.start_date <= today && popup.end_date >= today) {
        return "Happening now";
    }

    return `Opens ${formatPopupDate(popup.start_date)}`;
}

export function getFreshnessLabel(lastVerifiedAt: string | null) {
    if (!lastVerifiedAt) return "Source listed";

    const verified = new Date(lastVerifiedAt);
    const today = new Date();
    const isToday = verified.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
    }) === today.toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
    });

    if (isToday) return "Checked today";

    return `Checked ${verified.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
    })}`;
}

const VIP_BRAND_NAMES: Record<string, string> = {
    "3-1-phillip-lim": "3.1 Phillip Lim",
    "ds-durga": "D.S. & Durga",
    "lagence": "L'Agence",
};

function cleanStoredPopupName(name: string) {
    return name
        .replace(/(?:\s*\(copy\))+\s*$/gi, "")
        .replace(/-m\d+\s*$/i, "")
        .trim();
}

function titleCaseSlug(value: string) {
    return value
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function getPopupDisplayName(
    popup: Pick<Popup, "name" | "source_provider" | "source_url">,
) {
    const storedName = cleanStoredPopupName(popup.name);

    if (popup.source_provider !== "vipsamplesale" || !popup.source_url) {
        return storedName;
    }

    try {
        const slug = decodeURIComponent(new URL(popup.source_url).pathname)
            .split("/")
            .filter(Boolean)
            .at(-1);
        const brandSlug = slug?.match(
            /^(.*?)(?:-m\d+)?-new-york-sample-sale(?:-\d{4}-q\d+)?$/i,
        )?.[1]?.toLowerCase();

        if (!brandSlug) return storedName;

        const brandName = VIP_BRAND_NAMES[brandSlug] ?? titleCaseSlug(brandSlug);
        return `${brandName} Sample Sale`;
    } catch {
        return storedName;
    }
}

export function isSampleSalePopup(
    popup: Pick<Popup, "name" | "source_url">,
) {
    return /sample sale/i.test(popup.name) ||
        /sample-sale/i.test(popup.source_url ?? "");
}
