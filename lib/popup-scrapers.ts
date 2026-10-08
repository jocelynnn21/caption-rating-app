import { createHash } from "node:crypto";

export type ScrapedPopup = {
    name: string;
    description: string;
    neighborhood: string;
    address: string;
    start_date: string;
    end_date: string;
    category: "Fashion" | "Beauty" | "Food & Drink" | "Music" | "Art";
    price: string;
    image_url: string | null;
    source_url: string;
    source_key: string;
    source_provider: "nycforfree" | "vipsamplesale";
    source_title: string;
    last_verified_at: string;
    is_active: true;
};

const sourceHeaders = {
    "User-Agent": "POPUP.NYC/1.0 (+limited-time event indexing)",
    Accept: "text/html,application/xhtml+xml",
};

const monthNumbers = new Map([
    ["january", "01"], ["february", "02"], ["march", "03"],
    ["april", "04"], ["may", "05"], ["june", "06"],
    ["july", "07"], ["august", "08"], ["september", "09"],
    ["october", "10"], ["november", "11"], ["december", "12"],
]);

function decodeHtml(value: string) {
    const named: Record<string, string> = {
        amp: "&", apos: "'", hellip: "…", mdash: "—", ndash: "–",
        quot: '"', rsquo: "’", nbsp: " ",
    };

    return value
        .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
            String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code: string) =>
            String.fromCodePoint(Number.parseInt(code, 10)))
        .replace(/&([a-z]+);/gi, (entity, name: string) => named[name.toLowerCase()] ?? entity)
        .replace(/\s+/g, " ")
        .trim();
}

function stripTags(value: string) {
    return decodeHtml(value.replace(/<[^>]+>/g, " "));
}

function getTagAttribute(tag: string, attribute: string) {
    const match = tag.match(new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i"));
    return match ? decodeHtml(match[1]) : "";
}

function getMeta(html: string, key: string) {
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    const tag = tags.find((candidate) =>
        [getTagAttribute(candidate, "name"), getTagAttribute(candidate, "property")]
            .map((value) => value.toLowerCase())
            .includes(key.toLowerCase()));
    return tag ? getTagAttribute(tag, "content") : "";
}

function normalizeImageUrl(value: string, baseUrl: string) {
    if (!value || value.startsWith("data:")) return null;

    try {
        const url = new URL(decodeHtml(value), baseUrl);
        if (!/^https?:$/.test(url.protocol)) return null;
        if (/logo|icon|avatar|pixel|spacer|blank|placeholder|property_asset|doubleclick|trackimp/i.test(url.pathname)) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function collectJsonLdImages(value: unknown, images: string[]) {
    if (Array.isArray(value)) {
        value.forEach((item) => collectJsonLdImages(item, images));
        return;
    }
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
        if (key === "image") {
            if (typeof child === "string") images.push(child);
            if (Array.isArray(child)) {
                child.forEach((item) => {
                    if (typeof item === "string") images.push(item);
                    else if (item && typeof item === "object" && "url" in item && typeof item.url === "string") {
                        images.push(item.url);
                    }
                });
            }
            if (child && typeof child === "object" && "url" in child && typeof child.url === "string") {
                images.push(child.url);
            }
        }
        collectJsonLdImages(child, images);
    }
}

function getBestImage(html: string, baseUrl: string) {
    const candidates: string[] = [];

    for (const key of ["og:image:secure_url", "og:image", "twitter:image"]) {
        const value = getMeta(html, key);
        if (value) candidates.push(value);
    }

    const jsonLdScripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
    for (const script of jsonLdScripts) {
        const raw = script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
        try {
            collectJsonLdImages(JSON.parse(raw), candidates);
        } catch {
            // Some publishers ship invalid JSON-LD. Other image sources still work.
        }
    }

    const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of imageTags) {
        const itemProp = getTagAttribute(tag, "itemprop").toLowerCase();
        const className = getTagAttribute(tag, "class").toLowerCase();
        const isLikelyEventImage = itemProp === "image" || /event|hero|cover|featured/.test(className);
        if (!isLikelyEventImage) continue;

        for (const attribute of ["data-src", "data-lazy-src", "src"]) {
            const value = getTagAttribute(tag, attribute);
            if (value) candidates.push(value);
        }
        const srcset = getTagAttribute(tag, "srcset");
        if (srcset) {
            const largest = srcset.split(",").at(-1)?.trim().split(/\s+/)[0];
            if (largest) candidates.push(largest);
        }
    }

    const visualTags = html.match(/<[a-z0-9]+\b[^>]*(?:class=["'][^"']*(?:event|hero|cover|featured)[^"']*["']|itemprop=["']image["'])[^>]*>/gi) ?? [];
    for (const tag of visualTags) {
        const style = getTagAttribute(tag, "style");
        const backgroundImage = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i)?.[1];
        if (backgroundImage) candidates.push(backgroundImage);

        for (const attribute of ["data-background", "data-bg", "data-image", "data-src"]) {
            const value = getTagAttribute(tag, attribute);
            if (value) candidates.push(value);
        }
    }

    for (const candidate of candidates) {
        const normalized = normalizeImageUrl(candidate, baseUrl);
        if (normalized) return normalized;
    }

    return null;
}

function getEventData(html: string, key: string) {
    const match = html.match(new RegExp(
        `<([a-z0-9]+)[^>]*event-data=["']${key}["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
        "i"));
    return match ? stripTags(match[2]) : "";
}

function getDataAttribute(html: string, attribute: string) {
    const match = html.match(new RegExp(`data-${attribute}=["']([^"']+)["']`, "i"));
    return match ? decodeHtml(match[1]) : "";
}

function parseWrittenDate(value: string) {
    const match = value.match(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i);
    if (!match) return null;
    const month = monthNumbers.get(match[1].toLowerCase());
    return month ? `${match[3]}-${month}-${match[2].padStart(2, "0")}` : null;
}

function parseDateRange(value: string) {
    const matches = [...value.matchAll(
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/gi)];
    const dates = matches.map((match) => parseWrittenDate(match[0]))
        .filter((date): date is string => Boolean(date));
    return dates.length > 0 ? { start: dates[0], end: dates[1] ?? dates[0] } : null;
}

function createSourceKey(sourceUrl: string) {
    return createHash("sha256").update(sourceUrl).digest("hex");
}

function inferCategory(value: string): ScrapedPopup["category"] {
    const text = value.toLowerCase();
    if (/beauty|skin|makeup|cosmetic|fragrance|hair/.test(text)) return "Beauty";
    if (/food|drink|coffee|cafe|bakery|diner|restaurant|latte|snack/.test(text)) return "Food & Drink";
    if (/music|album|concert|record|vinyl|artist/.test(text)) return "Music";
    if (/fashion|sample sale|clothing|designer|apparel|shoe|jewel/.test(text)) return "Fashion";
    return "Art";
}

function extractLinks(html: string, baseUrl: string, pattern: RegExp) {
    const links = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)]
        .map((match) => {
            try { return new URL(decodeHtml(match[1]), baseUrl).toString(); }
            catch { return null; }
        })
        .filter((url): url is string => typeof url === "string")
        .filter((url) => pattern.test(url));
    return [...new Set(links)];
}

async function fetchHtml(url: string) {
    const response = await fetch(url, {
        headers: sourceHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R | null>) {
    const results: Array<R | null> = new Array(items.length).fill(null);
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex++;
            try { results[index] = await mapper(items[index]); }
            catch (error) { console.warn("Popup source page skipped:", error); }
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
    return results.filter((result): result is R => result !== null);
}

function looksLikePopup(name: string, description: string) {
    return /pop[- ]?up|sample sale|brand experience|experience by|\sx\s|activation|installation|launch|takeover|bodega|diner|coffee shop|cafe/i
        .test(`${name} ${description}`);
}

async function scrapeNycForFree(
    today: string,
    verifiedAt: string
): Promise<ScrapedPopup[]> {
    const listingUrl = "https://www.nycforfree.co/events";
    const listing = await fetchHtml(listingUrl);
    const urls = extractLinks(listing, listingUrl,
        /^https:\/\/www\.nycforfree\.co\/events\/[^/?#]+$/i).slice(0, 60);

    return mapWithConcurrency<string, ScrapedPopup>(urls, 6, async (sourceUrl) => {
        const html = await fetchHtml(sourceUrl);
        const name = getDataAttribute(html, "name") || getMeta(html, "og:title").replace(/\s*\|.*$/, "");
        const description = getMeta(html, "description");
        const startDate = parseWrittenDate(getEventData(html, "start-date"));
        const endDate = parseWrittenDate(getEventData(html, "end-date")) ?? startDate;

        if (!name || !description || !startDate || !endDate || endDate < today ||
            !looksLikePopup(name, description)) return null;

        const address = getDataAttribute(html, "address") ||
            getEventData(html, "location-address") || "See source";
        const neighborhood = getDataAttribute(html, "place") ||
            getEventData(html, "location-name") || "New York City";
        const sourceCategory = getDataAttribute(html, "category");

        return {
            name, description, neighborhood, address,
            start_date: startDate, end_date: endDate,
            category: inferCategory(`${sourceCategory} ${name} ${description}`),
            price: /\bfree\b/i.test(description) ? "Free" : "See source",
            image_url: getBestImage(html, sourceUrl),
            source_url: sourceUrl,
            source_key: createSourceKey(sourceUrl),
            source_provider: "nycforfree" as const,
            source_title: "NYC for FREE",
            last_verified_at: verifiedAt,
            is_active: true as const,
        };
    });
}

function findVipAddress(html: string) {
    const match = stripTags(html).match(
        /\b\d{1,5}\s+[A-Za-z0-9.' -]+(?:Street|St|Avenue|Ave|Broadway|Boulevard|Blvd|Road|Rd),?\s+New York,\s*NY(?:\s+\d{5})?/i);
    return match?.[0] ?? "See source";
}

async function scrapeVipSampleSale(
    today: string,
    verifiedAt: string
): Promise<ScrapedPopup[]> {
    const listingUrl = "https://www.vipsamplesale.com/nycsamplesales";
    const listing = await fetchHtml(listingUrl);
    const excludedPaths = new Set([
        "/homepage", "/about", "/nycsamplesales", "/online-events",
        "/newyork-fashion-beauty-popup-event", "/submit-your-event", "/register-your-brands",
    ]);
    const urls = extractLinks(listing, listingUrl,
        /^https:\/\/www\.vipsamplesale\.com\/[^/?#]+$/i)
        .filter((url) => !excludedPaths.has(new URL(url).pathname)).slice(0, 30);

    return mapWithConcurrency<string, ScrapedPopup>(urls, 6, async (sourceUrl) => {
        const html = await fetchHtml(sourceUrl);
        const name = getMeta(html, "og:title")
            .replace(/\s+[—-]\s+VIP SAMPLE SALE.*$/i, "").trim();
        const text = stripTags(html);
        const dateRange = parseDateRange(text);
        if (!name || !dateRange || dateRange.end < today) return null;

        const description = `${name} is a limited-time fashion sale in New York City.`;
        return {
            name,
            description,
            neighborhood: /\bSoHo\b/i.test(text) ? "SoHo" : "New York City",
            address: findVipAddress(html),
            start_date: dateRange.start,
            end_date: dateRange.end,
            category: "Fashion" as const,
            price: "See source",
            image_url: getBestImage(html, sourceUrl),
            source_url: sourceUrl,
            source_key: createSourceKey(sourceUrl),
            source_provider: "vipsamplesale" as const,
            source_title: "VIP Sample Sale",
            last_verified_at: verifiedAt,
            is_active: true as const,
        };
    });
}

const imageBackfillHosts = new Set([
    "donyc.com",
    "www.donyc.com",
    "nycforfree.co",
    "www.nycforfree.co",
    "vipsamplesale.com",
    "www.vipsamplesale.com",
]);

export async function scrapePopupImage(sourceUrl: string) {
    const url = new URL(sourceUrl);
    if (!imageBackfillHosts.has(url.hostname)) return null;
    const html = await fetchHtml(url.toString());
    return getBestImage(html, url.toString());
}

export async function scrapePopupSources(today: string) {
    const verifiedAt = new Date().toISOString();
    const settled: PromiseSettledResult<ScrapedPopup[]>[] = await Promise.allSettled([
        scrapeNycForFree(today, verifiedAt),
        scrapeVipSampleSale(today, verifiedAt),
    ]);
    const events: ScrapedPopup[] = [];
    for (const result of settled) {
        if (result.status === "fulfilled") events.push(...result.value);
        else console.error("Popup listing source failed:", result.reason);
    }

    return [...new Map(events.map((event) => [event.source_key, event])).values()]
        .sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 40);
}
