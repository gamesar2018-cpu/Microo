export const config = { runtime: "edge" };

const TARGET = (process.env.TARGET_DOMAIN ?? "").replace(/\/$/, "");

const BLOCK_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function handler(request) {
  if (!TARGET) {
    return new Response("Config missing", { status: 500 });
  }

  try {
    const cutIndex = request.url.indexOf("/", 8);
    const finalUrl =
      cutIndex === -1 ? TARGET + "/" : TARGET + request.url.slice(cutIndex);

    const headers = new Headers();
    let ip = null;

    for (const [key, value] of request.headers) {
      const k = key.toLowerCase();

      if (BLOCK_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;

      if (k === "x-real-ip" || k === "x-forwarded-for") {
        if (!ip) ip = value;
        continue;
      }

      headers.set(key, value);
    }

    if (ip) headers.set("x-forwarded-for", ip);

    const method = request.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const response = await fetch(finalUrl, {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
    });

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });

  } catch (e) {
    console.error("relay error:", e);
    return new Response("Request failed", { status: 502 });
  }
}
