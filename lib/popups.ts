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
