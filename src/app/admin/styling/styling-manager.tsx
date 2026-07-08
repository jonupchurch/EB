"use client";

import { useState } from "react";
import {
  createStylingCatalogEntry,
  deleteStylingCatalogEntry,
  updateStylingCatalogEntry,
  type StylingCatalogListItem,
} from "./actions";

export function StylingManager({ initial }: { initial: StylingCatalogListItem[] }) {
  const [entries, setEntries] = useState(initial);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  async function handleCreate() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setError(null);
    const result = await createStylingCatalogEntry(trimmed);
    if (result.ok) {
      setEntries((prev) =>
        [...prev, { ...result.data, usageCount: 0 }].sort((a, b) =>
          a.label.localeCompare(b.label),
        ),
      );
      setNewLabel("");
    } else {
      setError(result.fieldErrors?.label ?? "Could not create styling option");
    }
  }

  function startEditing(entry: StylingCatalogListItem) {
    setEditingId(entry.id);
    setEditingLabel(entry.label);
  }

  async function handleRename(id: number) {
    const trimmed = editingLabel.trim();
    if (!trimmed) return;
    setError(null);
    const result = await updateStylingCatalogEntry(id, trimmed);
    if (result.ok) {
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, label: result.data.label } : e))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      setEditingId(null);
    } else {
      setError(result.fieldErrors?.label ?? "Could not rename styling option");
    }
  }

  async function handleDelete(id: number, label: string) {
    if (
      !window.confirm(
        `Delete "${label}"? It will be removed from any product currently using it — this cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    const result = await deleteStylingCatalogEntry(id);
    if (result.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } else {
      setError("Could not delete styling option");
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New styling option name"
          className="flex-1 rounded border border-cream-deeper bg-white px-3 py-2 text-sm text-ink"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="rounded bg-teal px-4 py-2 text-sm font-medium text-white"
        >
          + Add styling option
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted">No styling options yet.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-cream-deeper text-muted">
              <th className="py-2 pr-4 font-medium">Name</th>
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
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      aria-label="Styling option name"
                      autoFocus
                      className="rounded border border-cream-deeper bg-white px-2 py-1 text-sm text-ink"
                    />
                  ) : (
                    <span className="text-ink">{entry.label}</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-ink">{entry.usageCount}</td>
                <td className="py-2 pr-4">
                  {editingId === entry.id ? (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleRename(entry.id)}
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
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, entry.label)}
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
