"use client";

import { useState } from "react";
import {
  createMaterialCatalogEntry,
  deleteMaterialCatalogEntry,
  updateMaterialCatalogEntry,
  type MaterialCatalogListItem,
} from "./actions";

export function MaterialsManager({ initial }: { initial: MaterialCatalogListItem[] }) {
  const [entries, setEntries] = useState(initial);
  const [newModelNumber, setNewModelNumber] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingModelNumber, setEditingModelNumber] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  function sortEntries(list: MaterialCatalogListItem[]) {
    return [...list].sort((a, b) => a.description.localeCompare(b.description));
  }

  async function handleCreate() {
    const trimmed = newDescription.trim();
    if (!trimmed) return;
    setError(null);
    const result = await createMaterialCatalogEntry(newModelNumber.trim() || undefined, trimmed);
    if (result.ok) {
      setEntries((prev) => sortEntries([...prev, { ...result.data, usageCount: 0 }]));
      setNewModelNumber("");
      setNewDescription("");
    } else {
      setError(result.fieldErrors?.description ?? "Could not create material option");
    }
  }

  function startEditing(entry: MaterialCatalogListItem) {
    setEditingId(entry.id);
    setEditingModelNumber(entry.modelNumber ?? "");
    setEditingDescription(entry.description);
  }

  async function handleSave(id: number) {
    const trimmed = editingDescription.trim();
    if (!trimmed) return;
    setError(null);
    const result = await updateMaterialCatalogEntry(id, editingModelNumber.trim() || undefined, trimmed);
    if (result.ok) {
      setEntries((prev) =>
        sortEntries(
          prev.map((e) =>
            e.id === id
              ? { ...e, modelNumber: result.data.modelNumber, description: result.data.description }
              : e,
          ),
        ),
      );
      setEditingId(null);
    } else {
      setError(result.fieldErrors?.description ?? "Could not update material option");
    }
  }

  async function handleDelete(id: number, description: string) {
    if (
      !window.confirm(
        `Delete "${description}"? It will be removed from any product currently using it — this cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    const result = await deleteMaterialCatalogEntry(id);
    if (result.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } else {
      setError("Could not delete material option");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <input
          value={newModelNumber}
          onChange={(e) => setNewModelNumber(e.target.value)}
          placeholder="Model # (optional)"
          className="w-36 rounded border border-cream-deeper bg-white px-3 py-2 text-sm text-ink"
        />
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="New material description"
          className="flex-1 rounded border border-cream-deeper bg-white px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="rounded bg-teal px-4 py-2 text-sm font-medium text-white"
        >
          + Add material
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted">No material options yet.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cream-deeper text-muted">
              <th className="py-2 pr-4 font-medium">Model #</th>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 font-medium">Used by</th>
              <th className="py-2 pr-4 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-cream-deeper">
                <td className="py-2 pr-4">
                  {editingId === entry.id ? (
                    <input
                      value={editingModelNumber}
                      onChange={(e) => setEditingModelNumber(e.target.value)}
                      aria-label="Material model number"
                      autoFocus
                      className="w-28 rounded border border-cream-deeper bg-white px-2 py-1 text-sm text-ink"
                    />
                  ) : (
                    <span className="text-ink">{entry.modelNumber ?? "—"}</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  {editingId === entry.id ? (
                    <input
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      aria-label="Material description"
                      className="rounded border border-cream-deeper bg-white px-2 py-1 text-sm text-ink"
                    />
                  ) : (
                    <span className="text-ink">{entry.description}</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-ink">{entry.usageCount}</td>
                <td className="py-2 pr-4">
                  {editingId === entry.id ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSave(entry.id)}
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
                        onClick={() => startEditing(entry)}
                        className="text-sm font-medium text-teal"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, entry.description)}
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
