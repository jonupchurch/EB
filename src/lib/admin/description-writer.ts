// AI-assisted product description writer/editor (feature 8) — this
// project's first AI/LLM integration. Real path calls Claude Haiku 4.5
// via the Vercel AI Gateway, chosen for cost (docs/adr/0018). Behind
// this interface sits a deterministic fake, used whenever
// CHECKOUT_FAKE_PROVIDERS is set (every automated test) — despite its
// checkout-era name, this project's established fake-provider pattern
// (src/lib/confirmation/email.ts already reuses it for a non-checkout
// feature) treats it as the one project-wide "don't call real external
// services in tests" switch, not a new one per feature.

import { generateText, Output } from "ai";
import { z } from "zod";
import type { DescriptionRequest } from "./schemas";

// Confirmed via gateway.getAvailableModels() during planning — Gateway
// slugs use dots for versions (not the raw Anthropic API's hyphenated
// model ID), so this isn't guessed from memory.
const MODEL = "anthropic/claude-haiku-4.5";

const descriptionOutputSchema = z.object({ description: z.string() });

function usesFakeProviders(): boolean {
  return process.env.CHECKOUT_FAKE_PROVIDERS === "true";
}

function buildContextLines(request: DescriptionRequest): string[] {
  return [
    `Product name: ${request.name}`,
    request.categoryName ? `Category: ${request.categoryName}` : null,
    request.stylingLabels?.length ? `Styling options: ${request.stylingLabels.join(", ")}` : null,
    request.materialLabels?.length ? `Material options: ${request.materialLabels.join(", ")}` : null,
    request.basePriceCents !== undefined ? `Base price: $${(request.basePriceCents / 100).toFixed(2)}` : null,
  ].filter((line): line is string => line !== null);
}

// A deterministic template built from the actual input fields — not a
// hardcoded constant — so tests can verify real product data reaches
// this function, the same reasoning tax.ts's fake computes a rate
// rather than a fixed dollar figure.
function getFakeDescription(request: DescriptionRequest): string {
  const summary = buildContextLines(request).join("; ");
  return request.currentDescription
    ? `FAKE IMPROVED: ${summary}. (was: "${request.currentDescription}")`
    : `FAKE DRAFT: ${summary}.`;
}

function buildPrompt(request: DescriptionRequest): string {
  const context = buildContextLines(request).join("\n");
  const instructions =
    "Keep it to 2-4 concise, warm, sales-ready sentences for an online print/custom-goods shop. Return only the description text, no preamble.";

  return request.currentDescription
    ? `Rewrite and polish the following product description using the product details below as context.\n\n${instructions}\n\nProduct details:\n${context}\n\nCurrent description:\n${request.currentDescription}`
    : `Write a first-draft product description from the product details below.\n\n${instructions}\n\nProduct details:\n${context}`;
}

async function getRealDescription(request: DescriptionRequest): Promise<string> {
  const result = await generateText({
    model: MODEL,
    prompt: buildPrompt(request),
    output: Output.object({ schema: descriptionOutputSchema }),
  });
  return result.output.description;
}

export async function suggestProductDescription(
  request: DescriptionRequest,
): Promise<{ description: string }> {
  const description = usesFakeProviders()
    ? getFakeDescription(request)
    : await getRealDescription(request);
  return { description };
}
