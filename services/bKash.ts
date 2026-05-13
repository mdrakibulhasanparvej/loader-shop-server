import axios from "axios";

interface BkashPaymentData {
  total_amount: number;
  currency: string;
  merchantInvoiceNumber: string;
  success_url: string;
  fail_url: string;
  cancel_url: string;
  cus_name: string;
  cus_email: string;
  cus_phone: string;
}

let bkashToken: string | null = null;
let tokenExpiresAt: number = 0;

const getBkashBaseUrl = (): string => {
  return process.env.BKASH_ENV === "live"
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
};

const getBkashHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  authorization: process.env.BKASH_PASSWORD || "",
  "x-app-key": process.env.BKASH_APP_KEY || "",
});

const grantToken = async (): Promise<string> => {
  if (bkashToken && Date.now() < tokenExpiresAt) {
    return bkashToken;
  }

  const baseURL = getBkashBaseUrl();
  const response = await axios.post(
    `${baseURL}/tokenized/checkout/token/grant`,
    {
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    },
    { headers: getBkashHeaders() },
  );

  bkashToken = (response.data as any).id_token;
  tokenExpiresAt = Date.now() + 3500000;
  return bkashToken!;
};

export const initiateBkashPayment = async (paymentData: BkashPaymentData) => {
  const token = await grantToken();
  const baseURL = getBkashBaseUrl();

  const response = await axios.post(
    `${baseURL}/tokenized/checkout/create`,
    {
      mode: "0011",
      payerReference: paymentData.merchantInvoiceNumber,
      callbackURL: {
        success: paymentData.success_url,
        fail: paymentData.fail_url,
        cancel: paymentData.cancel_url,
      },
      amount: paymentData.total_amount.toString(),
      currency: paymentData.currency || "BDT",
      intent: "sale",
      merchantInvoiceNumber: paymentData.merchantInvoiceNumber,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": process.env.BKASH_APP_KEY || "",
      },
    },
  );

  return response.data;
};

export const executeBkashPayment = async (paymentID: string) => {
  const token = await grantToken();
  const baseURL = getBkashBaseUrl();

  const response = await axios.post(
    `${baseURL}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": process.env.BKASH_APP_KEY || "",
      },
    },
  );

  return response.data;
};

export const queryBkashPayment = async (paymentID: string) => {
  const token = await grantToken();
  const baseURL = getBkashBaseUrl();

  const response = await axios.post(
    `${baseURL}/tokenized/checkout/payment/status`,
    { paymentID },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": process.env.BKASH_APP_KEY || "",
      },
    },
  );

  return response.data;
};
