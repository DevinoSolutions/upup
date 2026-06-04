const DEMO_PREFIX = "/api/upup-demo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
};

function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function text(body: string, init: ResponseInit = {}) {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function safeName(value: unknown) {
  const name = typeof value === "string" && value ? value : "demo-upload.txt";
  return name.replace(/[^\w.-]+/g, "_").slice(0, 96) || "demo-upload.txt";
}

function keyFor(name: string, size: unknown) {
  const bytes = typeof size === "number" && Number.isFinite(size) ? size : 0;
  return `landing-demo/${bytes}-${name}`;
}

function demoPath(request: Request) {
  const url = new URL(request.url);
  return url.pathname.replace(DEMO_PREFIX, "").replace(/^\/+/, "");
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(request: Request) {
  const path = demoPath(request);

  if (path === "health") {
    return json({ ok: true, route: "upup-demo" });
  }

  if (path.startsWith("object/sample.txt")) {
    return text("Upup landing demo sample file.\n".repeat(80), {
      headers: {
        "Content-Disposition": 'attachment; filename="sample.txt"',
      },
    });
  }

  if (path.startsWith("object/")) {
    const name = decodeURIComponent(path.split("/").pop() ?? "demo-upload.txt");
    return text(`Stored by the deterministic Upup landing demo: ${name}\n`);
  }

  return json({ error: "Not found" }, { status: 404 });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const path = demoPath(request);
  const body = await readBody(request);

  if (!path.startsWith("presign")) {
    return json({ error: "Not found" }, { status: 404 });
  }

  if (url.searchParams.get("fail") === "1") {
    return json({ error: "Demo presign failure" }, { status: 503 });
  }

  const name = safeName(body.name);
  const key = keyFor(name, body.size);
  const encodedKey = encodeURIComponent(key);

  return json({
    uploadUrl: `${url.origin}${DEMO_PREFIX}/upload/${encodedKey}`,
    key,
    publicUrl: `${url.origin}${DEMO_PREFIX}/object/${encodedKey}`,
    expiresIn: 3600,
  });
}

export async function PUT(request: Request) {
  const path = demoPath(request);
  if (!path.startsWith("upload/")) {
    return json({ error: "Not found" }, { status: 404 });
  }

  await request.arrayBuffer();
  const key = decodeURIComponent(path.replace(/^upload\//, ""));

  return json({
    ok: true,
    key,
    publicUrl: `${new URL(request.url).origin}${DEMO_PREFIX}/object/${encodeURIComponent(key)}`,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET,POST,PUT,OPTIONS",
      "Cache-Control": "no-store",
      ...corsHeaders,
    },
  });
}
