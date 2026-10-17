import { MetadataRoute } from "next";

/**
 * Generates /robots.txt via Next.js's built-in Metadata Routes API.
 *
 * Rules:
 * - Public document pages (/public/doc/*) are allowed — these are intentionally
 *   shareable and should be indexed.
 * - Everything else is disallowed — the app is a private SaaS product; internal
 *   routes (/app/*, /admin/*, /api/*) should never appear in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL ?? "";

  return {
    rules: [
      {
        allow: "/public/doc/",
        disallow: "/",
        userAgent: "*",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
