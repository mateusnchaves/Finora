import type { MetadataRoute } from "next";

/** Search engines may read the public pages; everything behind the login stays out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/login", "/signup", "/privacy"], disallow: ["/"] }],
  };
}
