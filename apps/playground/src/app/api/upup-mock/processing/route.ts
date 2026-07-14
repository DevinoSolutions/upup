export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("fail") === "1") {
    return Response.json({ error: "Mock processing failure" }, { status: 500 });
  }

  if (url.searchParams.get("hang") === "1") {
    const stream = new ReadableStream({
      start() {
        // Intentionally keep the stream open so browser tests can verify
        // client-side processing timeout handling deterministically.
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const key = url.searchParams.get("key") ?? "missing-key";
  const encoder = new TextEncoder();
  const event = [
    `data: ${JSON.stringify({
      status: "processed",
      key,
      previewUrl: `/processed/${encodeURIComponent(key)}.jpg`,
    })}`,
    "",
    "",
  ].join("\n");

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(event));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
