"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProduct } from "./actions";

export function DeleteButton({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (
      !window.confirm(
        `Delete "${productName}"? This permanently removes the product and its photos — this cannot be undone.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await deleteProduct(productId);
      if (result.ok) {
        router.refresh();
      } else {
        setError("Could not delete product");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete product");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-sm text-red-700 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </span>
  );
}
