"use client";

import { useState } from "react";

// A controlled currency input that keeps its own local text buffer and
// only reformats on blur — a plain controlled `(cents/100).toFixed(2)`
// value fights the user mid-type (feature 1's 10c6a35 fix). Shared by
// every admin currency field (product pricing, promotion amounts,
// shipping settings).
export function PriceInput({
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
