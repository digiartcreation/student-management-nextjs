import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],

  /**
   * The Angular build is copied into `public/` by `npm run ui`, so a single
   * deployment serves the screens and the API from one origin. That is why the
   * frontend can keep calling a relative `/api` and the session cookie needs no
   * CORS at all.
   *
   * Angular owns its own paths (`/login`, `/students`, …). Those match no file
   * and no Next route, so they arrive here and are handed `index.html` for
   * Angular to resolve client-side. `fallback` runs only after real routes, API
   * handlers and `public/` files have all missed, so nothing above is shadowed.
   *
   * `/api` is excluded deliberately: without it a mistyped API path would be
   * answered with the SPA shell, and a fetch expecting JSON would fail on an
   * HTML body instead of reading a clean 404.
   */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/", destination: "/index.html" },
        { source: "/:path((?!api/).*)", destination: "/index.html" },
      ],
    };
  },
};

export default nextConfig;
