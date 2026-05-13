import Stripe from "stripe";

let stripeInstance: ReturnType<typeof createStripe> | null = null;

const createStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe secret key not configured");
  }
  return new Stripe(secretKey);
};

const getStripe = () => {
  if (!stripeInstance) {
    stripeInstance = createStripe();
  }
  return stripeInstance;
};

export const createPaymentIntent = async (data: {
  amount: number;
  currency?: string;
  orderId: string;
  customerEmail?: string;
}) => {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(data.amount * 100),
    currency: data.currency || "bdt",
    metadata: { orderId: data.orderId },
    receipt_email: data.customerEmail,
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

export const retrievePaymentIntent = async (paymentIntentId: string) => {
  const stripe = getStripe();
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

export const constructWebhookEvent = (
  payload: Buffer | string,
  signature: string,
) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
};
