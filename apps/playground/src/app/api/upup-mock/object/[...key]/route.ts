const RED_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function contentTypeForKey(key: string) {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".json")) return "application/json";
  return "text/plain; charset=utf-8";
}

export async function PUT(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("fail") === "1") {
    return Response.json(
      { error: "Mock object upload failure" },
      { status: 503 },
    );
  }

  await request.arrayBuffer().catch(() => undefined);
  return new Response(null, { status: 200 });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ key?: string[] }> },
) {
  const params = await context.params;
  const key = params.key?.join("/") ?? "mock-object.txt";
  const contentType = contentTypeForKey(key);

  if (contentType === "image/png") {
    return new Response(Buffer.from(RED_PNG_BASE64, "base64"), {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  }

  return new Response(`Mock object for ${key}\n`, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
