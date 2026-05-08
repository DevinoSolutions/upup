function uploadUrl(request: Request, id: string) {
  const url = new URL(request.url);
  return new URL(`/api/upup-mock/tus/${encodeURIComponent(id)}`, url.origin).toString();
}

export async function POST(request: Request) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await request.arrayBuffer().catch(() => undefined);

  return new Response(null, {
    status: 201,
    headers: {
      "Tus-Resumable": "1.0.0",
      Location: uploadUrl(request, id),
      "Upload-Offset": "0",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Tus-Resumable": "1.0.0",
      "Tus-Version": "1.0.0",
      "Tus-Extension": "creation",
      "Tus-Max-Size": String(1024 * 1024 * 1024),
    },
  });
}
