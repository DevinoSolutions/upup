export async function GET(request: Request) {
  const url = new URL(request.url);
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
