"use server";

import { inspectEmbeddability, type EmbedCheck } from "@/lib/embeddable";
import { normalizeUrl } from "@/lib/url";

export async function checkEmbeddable(rawUrl: string): Promise<EmbedCheck> {
  const url = normalizeUrl(rawUrl);
  if (!url) return { status: "unreachable", reason: "That doesn't look like a valid URL." };
  return inspectEmbeddability(url);
}
