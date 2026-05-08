export async function PATCH(request: Request) {
  const body = await request.arrayBuffer().catch(() => new ArrayBuffer(0));
  const previousOffset = Number(request.headers.get("Upload-Offset") ?? "0");
  const nextOffset = previousOffset + body.byteLength;

  return new Response(null, {
    status: 204,
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": String(nextOffset),
      ETag: `"tus-${nextOffset}"`,
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Tus-Resumable": "1.0.0",
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
    },
  });
}
