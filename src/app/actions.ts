"use server";

import { headers } from "next/headers";
import { inspectEmbeddability, type EmbedCheck } from "@/lib/embeddable";
import { normalizeUrl } from "@/lib/url";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const MAX_TRACKED_CLIENTS = 5_000;

// In-process only: a deployment running several instances throttles per instance, so this
// stops casual abuse of an unauthenticated endpoint that makes outbound requests, not a
// distributed one. Anything stronger needs a shared store.
const recent = new Map<string, number[]>();

function withinRateLimit(client: string): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  if (recent.size > MAX_TRACKED_CLIENTS) {
    for (const [key, times] of recent) {
      if (times[times.length - 1] <= cutoff) recent.delete(key);
    }
  }

  const times = (recent.get(client) ?? []).filter((time) => time > cutoff);
  if (times.length >= MAX_PER_WINDOW) {
    recent.set(client, times);
    return false;
  }

  times.push(now);
  recent.set(client, times);
  return true;
}

async function clientKey(): Promise<string> {
  const header = await headers();
  // Trustworthy only behind a proxy that overwrites it, which is the deployment target.
  const forwarded = header.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || header.get("x-real-ip") || "unknown";
}

export async function checkEmbeddable(rawUrl: string): Promise<EmbedCheck> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { status: "unreachable", reason: "That doesn't look like a valid URL." };

  if (!withinRateLimit(await clientKey())) {
    // Deliberately "unreachable" rather than "blocked": the preview still loads, it just
    // goes in without a header check rather than being refused outright.
    return {
      status: "unreachable",
      reason: "Too many previews checked in the last minute. The preview will still try to load.",
    };
  }

  return inspectEmbeddability(url);
}
