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

  async function handleClick() {
    if (
      !window.confirm(
        `Delete "${productName}"? This permanently removes the product and its photos — this cannot be undone.`,
      )
    ) {
      return;
    }
    setPending(true);
    const result = await deleteProduct(productId);
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-700 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
