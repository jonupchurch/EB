"use client";

import { useState } from "react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryListItem,
} from "./actions";

export function CategoriesManager({ initial }: { initial: CategoryListItem[] }) {
  const [categories, setCategories] = useState(initial);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    const result = await createCategory(trimmed);
    if (result.ok) {
      setCategories((prev) =>
        [...prev, { ...result.data, productCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewName("");
    } else {
      setError(result.fieldErrors?.name ?? "Could not create category");
    }
  }

  function startEditing(category: CategoryListItem) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  async function handleRename(id: number) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setError(null);
    const result = await updateCategory(id, trimmed);
    if (result.ok) {
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, name: result.data.name } : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingId(null);
    } else {
      setError(result.fieldErrors?.name ?? "Could not rename category");
    }
  }

  async function handleDelete(id: number, name: string) {
    if (
      !window.confirm(
        `Delete "${name}"? Any products using it will become uncategorized — this cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    const result = await deleteCategory(id);
    if (result.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      setError("Could not delete category");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded border border-cream-deeper bg-white px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="rounded bg-teal px-4 py-2 text-sm font-medium text-white"
        >
          + Add category
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted">No categories yet.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cream-deeper text-muted">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Products</th>
              <th className="py-2 pr-4 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-cream-deeper">
                <td className="py-2 pr-4">
                  {editingId === category.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      aria-label="Category name"
                      autoFocus
                      className="rounded border border-cream-deeper bg-white px-2 py-1 text-sm text-ink"
                    />
                  ) : (
                    <span className="text-ink">{category.name}</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-ink">{category.productCount}</td>
                <td className="py-2 pr-4">
                  {editingId === category.id ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleRename(category.id)}
                        className="text-sm font-medium text-teal"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-sm text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(category)}
                        className="text-sm font-medium text-teal"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category.id, category.name)}
                        className="text-sm text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
