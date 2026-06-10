import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pdfUrl = request.nextUrl.searchParams.get("url");

  if (!pdfUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    // 1. Replace Docker-internal hostname "minio" with "localhost"
    let resolvedUrl = pdfUrl.replace(/http:\/\/minio:9000/g, "http://localhost:9000");

    // 2. Strip presigned query params (X-Amz-*).
    //    The presigned signature was computed with host=minio, so it's invalid for host=localhost.
    //    Bucket policy already allows public read for *.pdf, so direct access works.
    const urlObj = new URL(resolvedUrl);
    const keysToRemove = [...urlObj.searchParams.keys()].filter(k => k.startsWith("X-Amz-"));
    keysToRemove.forEach(k => urlObj.searchParams.delete(k));
    resolvedUrl = urlObj.toString();

    const response = await fetch(resolvedUrl);

    if (!response.ok) {
      console.error(`PDF proxy: upstream ${response.status} for ${resolvedUrl}`);
      return NextResponse.json(
        { error: `Upstream responded with ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("PDF proxy error:", err);
    return NextResponse.json({ error: "Failed to fetch PDF" }, { status: 502 });
  }
}
