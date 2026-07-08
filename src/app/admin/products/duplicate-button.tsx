"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { duplicateProduct } from "./actions";

export function DuplicateButton({ productId }: { productId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const result = await duplicateProduct(productId);
      if (result.ok) {
        router.push(`/admin/products/${result.data.id}`);
      } else {
        setError("Could not duplicate product");
        setPending(false);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not duplicate product");
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-sm font-medium text-teal disabled:opacity-50"
      >
        {pending ? "Duplicating…" : "Duplicate"}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
