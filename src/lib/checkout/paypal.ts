// Direct REST calls to PayPal's Orders v2 and Webhooks APIs
// (docs/adr/0014-paypal-direct-rest-integration.md) — no SDK, so
// webhook signature verification (the one step Principle II treats as
// non-negotiable) stays fully transparent. Behind this interface sits
// a deterministic fake, used whenever CHECKOUT_FAKE_PROVIDERS is set
// (every automated test) — real PayPal credentials are never
// exercised in CI.

function usesFakeProviders(): boolean {
  return process.env.CHECKOUT_FAKE_PROVIDERS === "true";
}

function getBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET are not set.");
  }

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export interface CreatePayPalOrderParams {
  totalCents: number;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreatePayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
}

function fakeApprovalUrl(paypalOrderId: string, returnUrl: string, cancelUrl: string): string {
  const params = new URLSearchParams({
    orderId: paypalOrderId,
    returnUrl,
    cancelUrl,
  });
  return `/checkout/fake-paypal-approval?${params}`;
}

export async function createPayPalOrder(
  params: CreatePayPalOrderParams,
): Promise<CreatePayPalOrderResult> {
  if (usesFakeProviders()) {
    const paypalOrderId = `FAKE-${crypto.randomUUID()}`;
    return {
      paypalOrderId,
      approvalUrl: fakeApprovalUrl(paypalOrderId, params.returnUrl, params.cancelUrl),
    };
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { amount: { currency_code: "USD", value: (params.totalCents / 100).toFixed(2) } },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        // Shipping is already collected by this project's own checkout
        // form (and stored on the Order) — PayPal doesn't need to
        // collect it again.
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`PayPal order creation failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: string;
    links: { rel: string; href: string }[];
  };
  const approveLink = data.links.find((link) => link.rel === "approve" || link.rel === "payer-action");
  if (!approveLink) {
    throw new Error("PayPal order response did not include an approval link.");
  }

  return { paypalOrderId: data.id, approvalUrl: approveLink.href };
}

export interface CapturePayPalOrderResult {
  paypalOrderId: string;
  status: string;
  payerEmail: string | null;
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<CapturePayPalOrderResult> {
  if (usesFakeProviders()) {
    return { paypalOrderId, status: "COMPLETED", payerEmail: "e2e-fake-buyer@example.com" };
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`PayPal order capture failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: string;
    status: string;
    payer?: { email_address?: string };
  };

  return {
    paypalOrderId: data.id,
    status: data.status,
    payerEmail: data.payer?.email_address ?? null,
  };
}

export interface PayPalWebhookEvent {
  eventType: string;
  paypalOrderId: string | null;
}

export type WebhookVerificationResult =
  | { verified: true; event: PayPalWebhookEvent }
  | { verified: false };

interface ParsedWebhookBody {
  event_type?: string;
  resource?: {
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
}

/** Pure: extracts the fields this app cares about from a parsed webhook body. */
export function parseWebhookEvent(body: ParsedWebhookBody): PayPalWebhookEvent {
  return {
    eventType: body.event_type ?? "unknown",
    paypalOrderId: body.resource?.supplementary_data?.related_ids?.order_id ?? null,
  };
}

export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  rawBody: string,
): Promise<WebhookVerificationResult> {
  let parsedBody: ParsedWebhookBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return { verified: false };
  }
  const event = parseWebhookEvent(parsedBody);

  if (usesFakeProviders()) {
    return { verified: true, event };
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not set — cannot verify webhook signatures.");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${getBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: parsedBody,
    }),
  });

  if (!response.ok) {
    return { verified: false };
  }

  const data = (await response.json()) as { verification_status: string };
  if (data.verification_status !== "SUCCESS") {
    return { verified: false };
  }

  return { verified: true, event };
}
