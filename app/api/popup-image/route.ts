import { NextResponse } from "next/server";

const allowedImageHosts = new Set([
    "cdn.prod.website-files.com",
    "images.squarespace-cdn.com",
]);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedContentTypes = new Set([
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export async function GET(request: Request) {
    const requestedUrl = new URL(request.url).searchParams.get("url");

    if (!requestedUrl) {
        return NextResponse.json({ error: "Missing image URL." }, { status: 400 });
    }

    let source: URL;
    try {
        source = new URL(requestedUrl);
    } catch {
        return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
    }

    if (source.protocol !== "https:" || !allowedImageHosts.has(source.hostname)) {
        return NextResponse.json({ error: "Image host is not allowed." }, { status: 403 });
    }

    try {
        const response = await fetch(source, {
            headers: { Accept: "image/avif,image/webp,image/*" },
            next: { revalidate: 86_400 },
            redirect: "error",
            signal: AbortSignal.timeout(8_000),
        });
        const contentType = response.headers.get("content-type") ?? "";
        const contentLength = Number(response.headers.get("content-length") ?? 0);

        const normalizedContentType = contentType.split(";")[0].trim().toLowerCase();
        if (!response.ok || !allowedContentTypes.has(normalizedContentType)) {
            return NextResponse.json({ error: "Image is unavailable." }, { status: 502 });
        }
        if (contentLength > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: "Image is too large." }, { status: 413 });
        }

        const image = await response.arrayBuffer();
        if (image.byteLength > MAX_IMAGE_BYTES) {
            return NextResponse.json({ error: "Image is too large." }, { status: 413 });
        }

        return new NextResponse(image, {
            headers: {
                "Content-Type": normalizedContentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                "Content-Length": String(image.byteLength),
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch {
        return NextResponse.json({ error: "Image could not be loaded." }, { status: 504 });
    }
}
