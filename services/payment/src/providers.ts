import { createHmac, timingSafeEqual } from "crypto";
import { randomUUID } from "crypto";

export interface CreateOrderParams {
  bookingId: string;
  amountMinor: number;
  currency?: string;
}

export interface OrderResult {
  providerOrderId: string;
  checkoutInfo: Record<string, unknown>;
}

export interface WebhookVerifyParams {
  rawBody: Buffer;
  signature: string;
  secret: string;
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>;
  verifyWebhookSignature(params: WebhookVerifyParams): boolean;
  name: string;
}

// ─── MockProvider ─────────────────────────────────────────────────────────────

export class MockProvider implements PaymentProvider {
  name = "mock";

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const providerOrderId = `mock_order_${randomUUID().replace(/-/g, "")}`;
    return {
      providerOrderId,
      checkoutInfo: {
        provider: "mock",
        providerOrderId,
        bookingId: params.bookingId,
        amountMinor: params.amountMinor,
        instructions: "Call POST /api/payments/mock/:orderId/complete to simulate payment.",
      },
    };
  }

  verifyWebhookSignature({ rawBody, signature, secret }: WebhookVerifyParams): boolean {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
      return false;
    }
  }
}

// ─── RazorpayProvider ─────────────────────────────────────────────────────────

export class RazorpayProvider implements PaymentProvider {
  name = "razorpay";
  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    // Dynamic import — razorpay package only needed when provider=razorpay
    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });

    const order = await instance.orders.create({
      amount: params.amountMinor,
      currency: params.currency || "INR",
      receipt: params.bookingId,
      payment_capture: 1,
    });

    return {
      providerOrderId: order.id,
      checkoutInfo: {
        provider: "razorpay",
        keyId: this.keyId,
        orderId: order.id,
        amount: params.amountMinor,
        currency: params.currency || "INR",
      },
    };
  }

  verifyWebhookSignature({ rawBody, signature, secret }: WebhookVerifyParams): boolean {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
    } catch {
      return false;
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createPaymentProvider(
  providerName: string,
  razorpayKeyId?: string,
  razorpayKeySecret?: string
): PaymentProvider {
  if (providerName === "razorpay") {
    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required for razorpay provider");
    }
    return new RazorpayProvider(razorpayKeyId, razorpayKeySecret);
  }
  return new MockProvider();
}
