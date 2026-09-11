import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Makes `next dev` expose the same Cloudflare bindings the deployed Worker gets.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {};

export default nextConfig;
