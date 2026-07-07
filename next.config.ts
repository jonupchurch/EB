import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly. Without this, Next.js/Turbopack can
  // infer the wrong root when a stray lockfile exists elsewhere under
  // D:\Codelib (e.g. the sibling fitt.d project), which would otherwise
  // produce an "inferred workspace root" warning on every build.
  turbopack: {
    root: __dirname,
  },
  // The migrate route reads drizzle/*.sql at runtime (not via static
  // import), so Next's automatic file tracing won't include them in
  // the deployed function bundle unless told to explicitly.
  outputFileTracingIncludes: {
    "/api/admin/migrate": ["./drizzle/**"],
  },
  // Next's own Server Action body limit defaults to 1MB, well under a
  // real phone photo — addProductImage (product-images.ts) uploads
  // files as FormData through a Server Action, so this must be raised
  // independently of Vercel Functions' own (much higher) request-body
  // limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
