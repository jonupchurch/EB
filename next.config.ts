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
};

export default nextConfig;
