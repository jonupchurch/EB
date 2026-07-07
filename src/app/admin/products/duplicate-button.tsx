"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateProduct } from "./actions";

export function DuplicateButton({ productId }: { productId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const result = await duplicateProduct(productId);
    setPending(false);
    if (result.ok) {
      router.push(`/admin/products/${result.data.id}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm font-medium text-teal disabled:opacity-50"
    >
      {pending ? "Duplicating…" : "Duplicate"}
    </button>
  );
}
