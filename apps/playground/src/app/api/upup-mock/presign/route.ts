function sanitizeName(name: unknown): string {
  if (typeof name !== "string" || name.trim() === "") return "file";
  return name.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

const failureCounts = new Map<string, number>();

export async function POST(request: Request) {
  const url = new URL(request.url);
  const failure = url.searchParams.get("fail");
  const body = await request.json().catch(() => ({}));
  const name = sanitizeName(body.name);
  const run = url.searchParams.get("run") ?? "default";
  const failureKey = `${failure ?? "none"}:${run}:${name}`;

  if (failure === "1" || failure === "presign") {
    return Response.json(
      { error: "Mock presign failure" },
      { status: 503 },
    );
  }

  if (failure === "once" || failure === "retry") {
    const count = failureCounts.get(failureKey) ?? 0;
    failureCounts.set(failureKey, count + 1);
    const failAttempts = failure === "retry" ? 4 : 1;
    if (count < failAttempts) {
      return Response.json(
        { error: "Mock presign failure" },
        { status: 503 },
      );
    }
  }

  const key = `mock/${Date.now()}-${name}`;
  const objectUrl = new URL(`/api/upup-mock/object/${encodeKey(key)}`, url.origin);

  if (failure === "put" || failure === "object") {
    objectUrl.searchParams.set("fail", "1");
  }

  return Response.json({
    key,
    uploadUrl: objectUrl.toString(),
    publicUrl: objectUrl.toString(),
    expiresIn: 3600,
  });
}
