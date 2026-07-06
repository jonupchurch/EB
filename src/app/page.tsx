export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">Printing Website</h1>
      <p className="max-w-md text-neutral-600">
        This storefront is under construction. See{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">status.md</code>{" "}
        in the repo for current build progress.
      </p>
    </main>
  );
}
