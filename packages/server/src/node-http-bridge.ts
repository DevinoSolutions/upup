/**
 * The ONE Node-request -> Web-`Request` and Web-`Response` -> Node-response bridge
 * for @upup/server's Node adapters (F-651). express.ts, fastify.ts, and
 * @upup/next's pages-handler.ts each hand-rolled this conversion and drifted:
 * two copied ALL response headers (incl. content-length) and sent a `.text()`
 * string; one correctly skipped content-length and sent a lossless Buffer. This
 * module pins the correct behavior for every future Node adapter to import
 * rather than re-derive.
 *
 * hono.ts / next.ts (App Router) are web-native (they receive/return a Web
 * Request/Response directly) and do not need this bridge.
 */

export function nodeHeadersToWeb(
  h: Record<string, string | string[] | undefined>,
): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const one of v) headers.append(k, one);
    else headers.set(k, v);
  }
  return headers;
}

export function toWebRequest(input: {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  // RequestInit['body'] (not the bare BodyInit alias): this tsconfig's
  // lib:["ES2020"] + @types/node resolve the composite RequestInit interface
  // globally (used elsewhere in this package, e.g. normalize-origin.ts) but
  // not every constituent type alias as its own global name.
  body?: RequestInit["body"];
}): Request {
  const hasBody = input.method !== "GET" && input.method !== "HEAD";
  return new Request(input.url, {
    method: input.method,
    headers: nodeHeadersToWeb(input.headers),
    body: hasBody ? input.body : undefined,
  });
}

/** Minimal Node-response sink. Express's res, Fastify's reply (via a thin
 *  method-name adapter), and Next's NextApiResponse all satisfy this shape. */
export interface NodeResponseSink {
  status(code: number): void;
  setHeader(name: string, value: string): void;
  send(body: Buffer): void;
}

export async function writeWebResponse(
  sink: NodeResponseSink,
  webRes: Response,
): Promise<void> {
  sink.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    // Node recomputes content-length from the payload; copying it risks a mismatch.
    if (key.toLowerCase() === "content-length") return;
    sink.setHeader(key, value);
  });
  sink.send(Buffer.from(await webRes.arrayBuffer()));
}
