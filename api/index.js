export const config = { runtime: "edge" };

const BASE = (process.env.TARGET_DOMAIN ?? "").replace(/\/$/, "");

const HIDE_HEADERS = new Set([
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

function extractPath(url) {
  const i = url.indexOf("/", 8);
  return i === -1 ? "/" : url.slice(i);
}

function cleanHeaders(input) {
  const result = new Headers();
  let realIp = "";

  for (const [name, value] of input) {
    const key = name.toLowerCase();

    if (HIDE_HEADERS.has(key)) continue;
    if (key.startsWith("x-vercel-")) continue;

    if (key === "x-real-ip" || key === "x-forwarded-for") {
      if (!realIp) realIp = value;
      continue;
    }

    result.set(name, value);
  }

  if (realIp) result.set("x-forwarded-for", realIp);

  return result;
}

export default async function handle(req) {
  if (!BASE) {
    return new Response("Config missing", { status: 500 });
  }

  try {
    const url = BASE + extractPath(req.url);
    const method = req.method;

    const res = await fetch(url, {
      method,
      headers: cleanHeaders(req.headers),
      body: method === "GET" || method === "HEAD" ? undefined : req.body,
      redirect: "manual",
    });

    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });

  } catch (err) {
    console.error("proxy fail:", err);
    return new Response("Service unavailable", { status: 502 });
  }
}
