import { del, put } from "@vercel/blob";

// Thin wrapper around Vercel Blob's server-side put()/del() — see
// docs/adr/0009-vercel-blob-for-product-images.md. Content-type
// validation happens at the Server Action boundary (Zod), not here.

export async function uploadProductImage(file: File): Promise<{ url: string }> {
  const blob = await put(`product-images/${crypto.randomUUID()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

export async function deleteProductImage(url: string): Promise<void> {
  await del(url);
}
