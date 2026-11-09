// One HTTP client for all uploaders. In dry-run mode it prints each request exactly as it would be
// sent (secrets redacted) and answers with the canned `dry` response, so a dry run walks the same
// code path as a real publish without touching the network.
import fs from "node:fs";
import { rel } from "./env.mjs";

const SECRET_KEYS =
  /^(access_token|client_secret|refresh_token|code|code_verifier|fb_exchange_token|input_token)$/;
const REDACTED = "«redacted»";

export class ApiError extends Error {
  constructor(message, { status, body, step } = {}) {
    super(message);
    this.status = status;
    this.body = body;
    this.step = step;
  }
}

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SECRET_KEYS.test(k) && !isPlaceholder(v) ? REDACTED : redact(v),
      ]),
    );
  }
  return value;
}

const isPlaceholder = (v) => typeof v === "string" && /^<.*>$/.test(v);

function redactHeader(k, v) {
  if (!/^authorization$/i.test(k) || isPlaceholder(v.split(" ")[1])) return v;
  return `${v.split(" ")[0]} ${REDACTED}`;
}

function redactUrl(u) {
  const url = new URL(u);
  for (const k of [...url.searchParams.keys()]) {
    if (SECRET_KEYS.test(k) && !isPlaceholder(url.searchParams.get(k)))
      url.searchParams.set(k, REDACTED);
  }
  return decodeURI(url.toString());
}

export function makeClient({
  dryRun = false,
  fetchImpl = globalThis.fetch,
  log = console.log,
} = {}) {
  let n = 0;

  function describe({ step, method, url, headers, form, json, file }) {
    n += 1;
    log(`\n  ${String(n).padStart(2)}. ${step}`);
    log(`      ${method} ${redactUrl(url)}`);
    for (const [k, v] of Object.entries(headers ?? {}))
      log(`      ${k}: ${redactHeader(k, String(v))}`);
    if (form) {
      log("      form:");
      for (const [k, v] of Object.entries(redact(form))) {
        const lines = String(v).split("\n");
        log(`        ${k}: ${lines[0]}`);
        for (const l of lines.slice(1))
          log(`        ${" ".repeat(k.length + 2)}${l}`);
      }
    }
    if (json) {
      log("      json:");
      for (const l of JSON.stringify(redact(json), null, 2).split("\n"))
        log(`        ${l}`);
    }
    if (file)
      log(`      body: ${rel(file.path)} (${file.size} bytes, video/mp4)`);
  }

  /**
   * @param {object} req  step, method, url, query, headers, form (urlencoded), json, file {path,size},
   *                      ok (extra accepted statuses), dry (canned response {status, headers, json})
   */
  async function request(req) {
    const url = new URL(req.url);
    for (const [k, v] of Object.entries(req.query ?? {}))
      if (v !== undefined) url.searchParams.set(k, String(v));
    const full = { ...req, url: url.toString() };
    if (dryRun) {
      describe(full);
      const d = req.dry ?? {};
      return {
        status: d.status ?? 200,
        headers: new Headers(d.headers ?? {}),
        json: d.json ?? {},
      };
    }
    const headers = { ...(req.headers ?? {}) };
    let body;
    if (req.form) {
      body = new URLSearchParams(
        Object.entries(req.form)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      );
    } else if (req.json) {
      body = JSON.stringify(req.json);
      headers["Content-Type"] ??= "application/json; charset=UTF-8";
    } else if (req.file) {
      body = fs.readFileSync(req.file.path);
    }
    let res;
    try {
      res = await fetchImpl(full.url, {
        method: req.method,
        headers,
        body,
        redirect: "manual",
      });
    } catch (e) {
      throw new ApiError(`${req.step}: network error — ${e.message}`, {
        step: req.step,
      });
    }
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text.slice(0, 500) };
    }
    if (!res.ok && !(req.ok ?? []).includes(res.status)) {
      const msg =
        json.error?.message ??
        json.error_description ??
        json.error ??
        json.raw ??
        res.statusText;
      throw new ApiError(
        `${req.step}: HTTP ${res.status} — ${typeof msg === "string" ? msg : JSON.stringify(msg)}`,
        {
          status: res.status,
          body: redact(json),
          step: req.step,
        },
      );
    }
    return { status: res.status, headers: res.headers, json };
  }

  return { request, dryRun };
}
