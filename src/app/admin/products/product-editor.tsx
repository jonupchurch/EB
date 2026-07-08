"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateTotalCents } from "@/lib/pricing";
import { createCategory } from "../categories/actions";
import { createMaterialCatalogEntry } from "../materials/actions";
import { createStylingCatalogEntry } from "../styling/actions";
import {
  addProductImage,
  removeProductImage,
  reorderProductImages,
  type ActionResult,
} from "./actions";

// --- Shared shapes ---

interface LabeledRow {
  _key: string;
  id?: number;
  label: string;
  priceAdjustmentCents: number;
  sortOrder?: number | null;
}

interface ProcessingRow extends LabeledRow {
  requiresCustomerUpload: boolean;
}

interface StylingRow {
  _key: string;
  id?: number;
  stylingCatalogId: number;
  priceAdjustmentCents: number;
  sortOrder?: number | null;
}

interface MaterialRow {
  _key: string;
  id?: number;
  materialCatalogId: number;
  priceAdjustmentCents: number;
  sortOrder?: number | null;
}

interface ColorRow extends LabeledRow {
  swatchHex: string;
}

export interface ProductEditorInitialData {
  name: string;
  description: string | null;
  basePriceCents: number;
  categoryId: number | null;
  status: "active" | "draft";
  weightOz: number | null;
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
  processingOptions: Array<{
    id: number;
    label: string;
    priceAdjustmentCents: number;
    sortOrder: number | null;
    requiresCustomerUpload: boolean;
  }>;
  stylingOptions: Array<{
    id: number;
    stylingCatalogId: number;
    priceAdjustmentCents: number;
    sortOrder: number | null;
  }>;
  materialOptions: Array<{
    id: number;
    materialCatalogId: number;
    priceAdjustmentCents: number;
    sortOrder: number | null;
  }>;
  sizeOptions: Array<{
    id: number;
    label: string;
    priceAdjustmentCents: number;
    sortOrder: number | null;
  }>;
  colorOptions: Array<{
    id: number;
    label: string;
    swatchHex: string | null;
    priceAdjustmentCents: number;
    sortOrder: number | null;
  }>;
  designLocationOptions: Array<{
    id: number;
    label: string;
    priceAdjustmentCents: number;
    sortOrder: number | null;
  }>;
  images: Array<{ id: number; url: string; sortOrder: number }>;
}

export interface ProductEditorSubmitPayload {
  name: string;
  description?: string;
  basePriceCents: number;
  categoryId?: number;
  status: "active" | "draft";
  weightOz?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  processingOptions: Array<{ label: string; priceAdjustmentCents: number; requiresCustomerUpload: boolean }>;
  stylingOptions: Array<{ stylingCatalogId: number; priceAdjustmentCents: number }>;
  materialOptions: Array<{ materialCatalogId: number; priceAdjustmentCents: number }>;
  sizeOptions: Array<{ label: string; priceAdjustmentCents: number }>;
  colorOptions: Array<{ label: string; swatchHex?: string; priceAdjustmentCents: number }>;
  designLocationOptions: Array<{ label: string; priceAdjustmentCents: number }>;
}

// Matches next.config.ts's experimental.serverActions.bodySizeLimit —
// a friendly client-side check so an oversized file shows a clear
// message instead of a generic 413 from the framework's own limit.
const MAX_IMAGE_BYTES = 10_000_000;

interface ProductEditorProps {
  categories: { id: number; name: string }[];
  stylingCatalog: { id: number; label: string }[];
  materialCatalog: { id: number; modelNumber: string | null; description: string }[];
  initial?: ProductEditorInitialData;
  productId?: number;
  onSubmit: (
    input: ProductEditorSubmitPayload,
  ) => Promise<ActionResult<{ id: number }>>;
  afterSubmitHref: string;
}

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `row-${keySeq}`;
}

function toLabeledRows(
  rows: Array<{ id: number; label: string; priceAdjustmentCents: number; sortOrder: number | null }>,
): LabeledRow[] {
  return rows.map((r) => ({ ...r, _key: nextKey() }));
}

export function ProductEditor({
  categories: initialCategories,
  stylingCatalog: initialStylingCatalog,
  materialCatalog: initialMaterialCatalog,
  initial,
  productId,
  onSubmit,
  afterSubmitHref,
}: ProductEditorProps) {
  const router = useRouter();
  const formId = useId();
  const photoInputId = useId();

  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [stylingCatalog, setStylingCatalog] = useState(initialStylingCatalog);
  const [materialCatalog, setMaterialCatalog] = useState(initialMaterialCatalog);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [basePriceCents, setBasePriceCents] = useState(initial?.basePriceCents ?? 0);
  const [categoryId, setCategoryId] = useState<number | undefined>(
    initial?.categoryId ?? undefined,
  );
  const [status, setStatus] = useState<"active" | "draft">(initial?.status ?? "draft");
  const [weightOz, setWeightOz] = useState<number | undefined>(initial?.weightOz ?? undefined);
  const [lengthIn, setLengthIn] = useState<number | undefined>(initial?.lengthIn ?? undefined);
  const [widthIn, setWidthIn] = useState<number | undefined>(initial?.widthIn ?? undefined);
  const [heightIn, setHeightIn] = useState<number | undefined>(initial?.heightIn ?? undefined);

  const [processingOptions, setProcessingOptions] = useState<ProcessingRow[]>(
    (initial?.processingOptions ?? []).map((r) => ({ ...r, _key: nextKey() })),
  );
  const [stylingOptions, setStylingOptions] = useState<StylingRow[]>(
    (initial?.stylingOptions ?? []).map((r) => ({ ...r, _key: nextKey() })),
  );
  const [materialOptions, setMaterialOptions] = useState<MaterialRow[]>(
    (initial?.materialOptions ?? []).map((r) => ({ ...r, _key: nextKey() })),
  );
  const [sizeOptions, setSizeOptions] = useState<LabeledRow[]>(
    toLabeledRows(initial?.sizeOptions ?? []),
  );
  const [colorOptions, setColorOptions] = useState<ColorRow[]>(
    (initial?.colorOptions ?? []).map((r) => ({
      ...r,
      swatchHex: r.swatchHex ?? "",
      _key: nextKey(),
    })),
  );
  const [designLocationOptions, setDesignLocationOptions] = useState<LabeledRow[]>(
    toLabeledRows(initial?.designLocationOptions ?? []),
  );

  const [images, setImages] = useState(initial?.images ?? []);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // A representative example combination — one row per single-select
  // category (the first) plus every design-location row — used only
  // to give the admin a live sanity-check total while entering prices.
  // There's no "customer selection" concept in this admin context.
  const previewOptions = [
    processingOptions[0],
    stylingOptions[0],
    materialOptions[0],
    sizeOptions[0],
    colorOptions[0],
    ...designLocationOptions,
  ]
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => ({ priceAdjustmentCents: o.priceAdjustmentCents }));
  const previewTotalCents = calculateTotalCents(basePriceCents, previewOptions);

  async function handleAddCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const result = await createCategory(trimmed);
    if (result.ok) {
      setCategories((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(result.data.id);
      setNewCategoryName("");
    }
  }

  function handleAddExistingStyling(stylingCatalogId: number) {
    setStylingOptions((prev) => [
      ...prev,
      { _key: nextKey(), stylingCatalogId, priceAdjustmentCents: 0 },
    ]);
  }

  async function handleCreateStylingCatalogEntry(label: string) {
    const result = await createStylingCatalogEntry(label);
    if (result.ok) {
      setStylingCatalog((prev) =>
        [...prev, result.data].sort((a, b) => a.label.localeCompare(b.label)),
      );
      handleAddExistingStyling(result.data.id);
    }
  }

  function handleAddExistingMaterial(materialCatalogId: number) {
    setMaterialOptions((prev) => [
      ...prev,
      { _key: nextKey(), materialCatalogId, priceAdjustmentCents: 0 },
    ]);
  }

  async function handleCreateMaterialCatalogEntry(modelNumber: string, description: string) {
    const result = await createMaterialCatalogEntry(modelNumber || undefined, description);
    if (result.ok) {
      setMaterialCatalog((prev) => [...prev, result.data]);
      handleAddExistingMaterial(result.data.id);
    }
  }

  async function handleImageUpload(file: File) {
    if (!productId) return;
    setImageError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(
        `That image is ${(file.size / 1_000_000).toFixed(1)}MB — please choose one under ${MAX_IMAGE_BYTES / 1_000_000}MB.`,
      );
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await addProductImage(productId, formData);
      if (result.ok) {
        setImages((prev) => [...prev, { ...result.data, sortOrder: prev.length }]);
      } else {
        setImageError(result.fieldErrors?.file ?? "Could not upload image");
      }
    } catch (error) {
      // A thrown error here (network issue, an unexpected server
      // exception) must never leave the UI silently stuck — always
      // surface something actionable (FR-011/FR-012: no silent
      // failures).
      setImageError(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(id: number) {
    if (!productId) return;
    setImageError(null);
    try {
      const result = await removeProductImage(id);
      if (result.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id));
      } else {
        setImageError("Could not remove image");
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not remove image");
    }
  }

  async function handleMoveImage(index: number, direction: -1 | 1) {
    if (!productId) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setImages(reordered);
    setImageError(null);
    try {
      const result = await reorderProductImages(
        productId,
        reordered.map((img) => img.id),
      );
      if (!result.ok) setImageError("Could not save the new image order");
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "Could not save the new image order");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload: ProductEditorSubmitPayload = {
      name,
      description: description || undefined,
      basePriceCents,
      categoryId,
      status,
      weightOz,
      lengthIn,
      widthIn,
      heightIn,
      processingOptions: processingOptions.map((o) => ({
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
        requiresCustomerUpload: o.requiresCustomerUpload,
      })),
      stylingOptions: stylingOptions.map((o) => ({
        stylingCatalogId: o.stylingCatalogId,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      materialOptions: materialOptions.map((o) => ({
        materialCatalogId: o.materialCatalogId,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      sizeOptions: sizeOptions.map((o) => ({
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      colorOptions: colorOptions.map((o) => ({
        label: o.label,
        swatchHex: o.swatchHex || undefined,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
      designLocationOptions: designLocationOptions.map((o) => ({
        label: o.label,
        priceAdjustmentCents: o.priceAdjustmentCents,
      })),
    };

    const result = await onSubmit(payload);
    setSaving(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? { _root: "Could not save product" });
      return;
    }

    // router.push already fetches fresh RSC data for the destination route
    // — calling router.refresh() immediately after races the push's own
    // transition (observed: it can leave the page stuck on the old route).
    router.push(afterSubmitHref);
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {fieldErrors._root && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{fieldErrors._root}</p>
      )}
      {Object.entries(fieldErrors).filter(([key]) => !["_root", "name", "basePriceCents"].includes(key))
        .length > 0 && (
        <ul className="space-y-1 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {Object.entries(fieldErrors)
            .filter(([key]) => !["_root", "name", "basePriceCents"].includes(key))
            .map(([key, message]) => (
              <li key={key}>
                {key}: {message}
              </li>
            ))}
        </ul>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Details</h2>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
          {fieldErrors.name && <p className="mt-1 text-sm text-red-700">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Add a new category"
              className="flex-1 rounded border border-cream-deeper bg-white px-3 py-1.5 text-sm text-ink"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="rounded bg-teal px-3 py-1.5 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="basePriceCents">
            Base price (USD)
          </label>
          <PriceInput
            id="basePriceCents"
            valueCents={basePriceCents}
            onChangeCents={setBasePriceCents}
            className="mt-1 w-40 rounded border border-cream-deeper bg-white px-3 py-2 text-ink"
          />
          {fieldErrors.basePriceCents && (
            <p className="mt-1 text-sm text-red-700">{fieldErrors.basePriceCents}</p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink">Status</legend>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                checked={status === "draft"}
                onChange={() => setStatus("draft")}
              />
              Draft
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                checked={status === "active"}
                onChange={() => setStatus("active")}
              />
              Active
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-4 gap-3">
          <NumberField label="Weight (oz)" value={weightOz} onChange={setWeightOz} />
          <NumberField label="Length (in)" value={lengthIn} onChange={setLengthIn} />
          <NumberField label="Width (in)" value={widthIn} onChange={setWidthIn} />
          <NumberField label="Height (in)" value={heightIn} onChange={setHeightIn} />
        </div>
      </section>

      <LabeledOptionSection
        title="Processing"
        rows={processingOptions}
        setRows={setProcessingOptions}
        newRow={() => ({ _key: nextKey(), label: "", priceAdjustmentCents: 0, requiresCustomerUpload: false })}
        renderExtra={(row, update) => (
          <label className="col-span-2 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={row.requiresCustomerUpload}
              onChange={(e) => update({ requiresCustomerUpload: e.target.checked })}
            />
            Not yet available to customers (requires a design upload flow)
          </label>
        )}
      />

      <StylingOptionSection
        catalog={stylingCatalog}
        rows={stylingOptions}
        setRows={setStylingOptions}
        onAddExisting={handleAddExistingStyling}
        onCreateNew={handleCreateStylingCatalogEntry}
      />

      <MaterialOptionSection
        catalog={materialCatalog}
        rows={materialOptions}
        setRows={setMaterialOptions}
        onAddExisting={handleAddExistingMaterial}
        onCreateNew={handleCreateMaterialCatalogEntry}
      />

      <LabeledOptionSection
        title="Size"
        rows={sizeOptions}
        setRows={setSizeOptions}
        newRow={() => ({ _key: nextKey(), label: "", priceAdjustmentCents: 0 })}
      />

      <ColorOptionSection rows={colorOptions} setRows={setColorOptions} />

      <LabeledOptionSection
        title="Design location"
        rows={designLocationOptions}
        setRows={setDesignLocationOptions}
        newRow={() => ({ _key: nextKey(), label: "", priceAdjustmentCents: 0 })}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Photos</h2>
        {!productId ? (
          <p className="text-sm text-muted">Save this product first to add photos.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {images.map((img, index) => (
                <div key={img.id} className="w-32 space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-32 w-32 rounded border border-cream-deeper object-cover"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleMoveImage(index, -1)}
                      disabled={index === 0}
                      className="text-muted disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveImage(index, 1)}
                      disabled={index === images.length - 1}
                      className="text-muted disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <label
              htmlFor={photoInputId}
              className={`inline-block rounded px-4 py-2 text-sm font-medium text-white ${
                uploading ? "cursor-not-allowed bg-teal/50" : "cursor-pointer bg-teal"
              }`}
            >
              {uploading ? "Uploading…" : "+ Add photo"}
            </label>
            <input
              id={photoInputId}
              type="file"
              accept="image/*"
              aria-label="Upload a product photo"
              disabled={uploading}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
                e.target.value = "";
              }}
            />
            {imageError && <p className="text-sm text-red-700">{imageError}</p>}
          </div>
        )}
      </section>

      <section className="rounded border border-cream-deeper bg-cream-deep px-4 py-3">
        <p className="text-sm text-muted">Example running total (base + one option per section)</p>
        <p className="text-2xl font-semibold text-ink">
          ${(previewTotalCents / 100).toFixed(2)}
        </p>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-teal px-5 py-2 font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="mt-1 w-full rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
      />
    </div>
  );
}

// A currency input backed by its own local string buffer, decoupled
// from the controlled `.toFixed(2)`-formatted value except when not
// focused. Reformatting the displayed value on every keystroke (the
// naive `value={(cents / 100).toFixed(2)}` approach) fights typing —
// e.g. entering "18.00" gets clobbered mid-type since the input snaps
// back to a fixed-decimal string after each character.
function PriceInput({
  id,
  ariaLabel,
  valueCents,
  onChangeCents,
  className,
}: {
  id?: string;
  ariaLabel?: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
  className?: string;
}) {
  const [text, setText] = useState((valueCents / 100).toFixed(2));
  const [focused, setFocused] = useState(false);
  const [syncedCents, setSyncedCents] = useState(valueCents);

  // Adjust state during render rather than in an effect (React's
  // recommended pattern for "resync local state when a prop changes,
  // but only while not actively editing it") — avoids an extra render
  // pass and the cascading-renders-in-effect lint warning.
  if (!focused && valueCents !== syncedCents) {
    setSyncedCents(valueCents);
    setText((valueCents / 100).toFixed(2));
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
        setText(raw);
        const parsed = Number(raw);
        if (raw !== "" && raw !== "." && !Number.isNaN(parsed)) {
          onChangeCents(Math.round(parsed * 100));
        }
      }}
      onBlur={() => {
        setFocused(false);
        setText((valueCents / 100).toFixed(2));
      }}
      className={className}
    />
  );
}

function LabeledOptionSection<T extends LabeledRow>({
  title,
  rows,
  setRows,
  newRow,
  renderExtra,
}: {
  title: string;
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  newRow: () => T;
  renderExtra?: (row: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  function update(key: string, patch: Partial<T>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row._key} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
            <input
              value={row.label}
              onChange={(e) => update(row._key, { label: e.target.value } as Partial<T>)}
              placeholder="Label"
              aria-label={`${title} option label`}
              className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
            />
            <PriceInput
              valueCents={row.priceAdjustmentCents}
              onChangeCents={(cents) =>
                update(row._key, { priceAdjustmentCents: cents } as Partial<T>)
              }
              ariaLabel={`${title} option price adjustment`}
              className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
            />
            <button
              type="button"
              onClick={() => remove(row._key)}
              className="text-sm text-red-700"
            >
              Remove
            </button>
            {renderExtra?.(row, (patch) => update(row._key, patch))}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newRow()])}
        className="text-sm font-medium text-teal"
      >
        + Add {title.toLowerCase()} option
      </button>
    </section>
  );
}

function StylingOptionSection({
  catalog,
  rows,
  setRows,
  onAddExisting,
  onCreateNew,
}: {
  catalog: { id: number; label: string }[];
  rows: StylingRow[];
  setRows: React.Dispatch<React.SetStateAction<StylingRow[]>>;
  onAddExisting: (catalogId: number) => void;
  onCreateNew: (label: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [newLabel, setNewLabel] = useState("");

  function update(key: string, priceAdjustmentCents: number) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, priceAdjustmentCents } : r)));
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  const available = catalog.filter(
    (c) => !rows.some((r) => r.stylingCatalogId === c.id),
  );

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Styling</h2>
      <div className="space-y-2">
        {rows.map((row) => {
          const entry = catalog.find((c) => c.id === row.stylingCatalogId);
          return (
            <div key={row._key} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
              <span className="text-sm text-ink">{entry?.label ?? "(removed from catalog)"}</span>
              <PriceInput
                valueCents={row.priceAdjustmentCents}
                onChangeCents={(cents) => update(row._key, cents)}
                ariaLabel="Styling option price adjustment"
                className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => remove(row._key)}
                className="text-sm text-red-700"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : "")}
          aria-label="Choose a styling option to add"
          className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
        >
          <option value="">Choose a styling option…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={selectedId === ""}
          onClick={() => {
            if (selectedId !== "") {
              onAddExisting(selectedId);
              setSelectedId("");
            }
          }}
          className="rounded bg-teal px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New styling option name"
          aria-label="New styling option name"
          className="flex-1 rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
        />
        <button
          type="button"
          onClick={() => {
            const trimmed = newLabel.trim();
            if (trimmed) {
              onCreateNew(trimmed);
              setNewLabel("");
            }
          }}
          className="text-sm font-medium text-teal"
        >
          + Create new styling option
        </button>
      </div>
    </section>
  );
}

function MaterialOptionSection({
  catalog,
  rows,
  setRows,
  onAddExisting,
  onCreateNew,
}: {
  catalog: { id: number; modelNumber: string | null; description: string }[];
  rows: MaterialRow[];
  setRows: React.Dispatch<React.SetStateAction<MaterialRow[]>>;
  onAddExisting: (catalogId: number) => void;
  onCreateNew: (modelNumber: string, description: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [newModelNumber, setNewModelNumber] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function update(key: string, priceAdjustmentCents: number) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, priceAdjustmentCents } : r)));
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  const available = catalog.filter(
    (c) => !rows.some((r) => r.materialCatalogId === c.id),
  );

  function catalogLabel(c: { modelNumber: string | null; description: string }) {
    return c.modelNumber ? `${c.description} (${c.modelNumber})` : c.description;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Material</h2>
      <div className="space-y-2">
        {rows.map((row) => {
          const entry = catalog.find((c) => c.id === row.materialCatalogId);
          return (
            <div key={row._key} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
              <span className="text-sm text-ink">
                {entry ? catalogLabel(entry) : "(removed from catalog)"}
              </span>
              <PriceInput
                valueCents={row.priceAdjustmentCents}
                onChangeCents={(cents) => update(row._key, cents)}
                ariaLabel="Material option price adjustment"
                className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => remove(row._key)}
                className="text-sm text-red-700"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : "")}
          aria-label="Choose a material option to add"
          className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
        >
          <option value="">Choose a material option…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {catalogLabel(c)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={selectedId === ""}
          onClick={() => {
            if (selectedId !== "") {
              onAddExisting(selectedId);
              setSelectedId("");
            }
          }}
          className="rounded bg-teal px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          + Add
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={newModelNumber}
          onChange={(e) => setNewModelNumber(e.target.value)}
          placeholder="Model # (optional)"
          aria-label="New material option model number"
          className="w-36 rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
        />
        <input
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="New material description"
          aria-label="New material option description"
          className="flex-1 rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
        />
        <button
          type="button"
          onClick={() => {
            const trimmed = newDescription.trim();
            if (trimmed) {
              onCreateNew(newModelNumber.trim(), trimmed);
              setNewModelNumber("");
              setNewDescription("");
            }
          }}
          className="text-sm font-medium text-teal"
        >
          + Create new material option
        </button>
      </div>
    </section>
  );
}

function ColorOptionSection({
  rows,
  setRows,
}: {
  rows: ColorRow[];
  setRows: React.Dispatch<React.SetStateAction<ColorRow[]>>;
}) {
  function update(key: string, patch: Partial<ColorRow>) {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Color</h2>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row._key}
            className="grid grid-cols-[1fr_80px_120px_auto] items-center gap-2"
          >
            <input
              value={row.label}
              onChange={(e) => update(row._key, { label: e.target.value })}
              placeholder="Label"
              aria-label="Color option label"
              className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
            />
            <input
              type="text"
              value={row.swatchHex}
              onChange={(e) => update(row._key, { swatchHex: e.target.value })}
              placeholder="#hex"
              aria-label="Color option swatch hex value"
              className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
            />
            <PriceInput
              valueCents={row.priceAdjustmentCents}
              onChangeCents={(cents) => update(row._key, { priceAdjustmentCents: cents })}
              ariaLabel="Color option price adjustment"
              className="rounded border border-cream-deeper bg-white px-2 py-1.5 text-sm text-ink"
            />
            <button type="button" onClick={() => remove(row._key)} className="text-sm text-red-700">
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setRows((prev) => [
            ...prev,
            { _key: nextKey(), label: "", swatchHex: "", priceAdjustmentCents: 0 },
          ])
        }
        className="text-sm font-medium text-teal"
      >
        + Add color option
      </button>
    </section>
  );
}
