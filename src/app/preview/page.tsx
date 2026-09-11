import { redirect } from "next/navigation";
import { PreviewStage } from "@/components/PreviewStage";
import { parseMode, parseOrientation } from "@/lib/devices";
import { normalizeUrl, toDisplayUrl } from "@/lib/url";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: PageProps<"/preview">) {
  const params = await searchParams;
  const url = normalizeUrl(first(params.url) ?? "");
  return { title: url ? `${toDisplayUrl(url)} — View on iPhone Duo` : "View on iPhone Duo" };
}

export default async function PreviewPage({ searchParams }: PageProps<"/preview">) {
  const params = await searchParams;
  const url = normalizeUrl(first(params.url) ?? "");
  if (!url) redirect("/");

  return (
    <PreviewStage
      url={url}
      initialMode={parseMode(first(params.mode))}
      initialOrientation={parseOrientation(first(params.orientation))}
    />
  );
}
