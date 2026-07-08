import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, isAllowedAdminEmail, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "Erica Burns Things - Admin",
};

// Session-gated admin shell (Constitution Principle II: admin routes
// enforce auth checks). The Auth.js signIn callback (src/auth.ts)
// already rejects unauthorized accounts before a session ever exists;
// this layout's isAllowedAdminEmail check is a second, independent
// guard (ADR-0006/research.md's "defense in depth" decision) so a
// route can never render for an unauthorized request regardless of
// how it was reached.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  if (!isAllowedAdminEmail(session.user.email)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-ink">Not authorized</h1>
          <p className="mt-2 text-muted">
            This account isn&apos;t authorized to access the admin area.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="w-56 shrink-0 border-r border-cream-deeper bg-cream-deep">
        <div className="p-6">
          <p className="text-lg font-semibold text-ink">Erica Burns Things</p>
          <p className="text-sm text-muted">Admin</p>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          <Link
            href="/admin/products"
            className="rounded px-3 py-2 text-sm font-medium text-ink hover:bg-cream-deeper"
          >
            Products
          </Link>
          <Link
            href="/admin/categories"
            className="rounded px-3 py-2 text-sm font-medium text-ink hover:bg-cream-deeper"
          >
            Categories
          </Link>
          <Link
            href="/admin/styling"
            className="rounded px-3 py-2 text-sm font-medium text-ink hover:bg-cream-deeper"
          >
            Styling
          </Link>
          <Link
            href="/admin/materials"
            className="rounded px-3 py-2 text-sm font-medium text-ink hover:bg-cream-deeper"
          >
            Materials
          </Link>
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-cream-deeper px-6 py-4">
          <p className="text-sm text-muted">{session.user.email}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-sm font-medium text-teal hover:underline"
            >
              Sign out
            </button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
