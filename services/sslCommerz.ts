import axios from "axios";

export const initiateSSLCommerzPayment = async (paymentData: any) => {
  const isLive = process.env.IS_LIVE === "true";
  const storeId = process.env.STORE_ID;
  const storePassword = process.env.STORE_PASSWORD;

  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz credentials not configured");
  }

  const baseURL = isLive
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";

  const data = {
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: paymentData.total_amount,
    currency: paymentData.currency || "BDT",
    tran_id: paymentData.tran_id,
    success_url: paymentData.success_url,
    fail_url: paymentData.fail_url,
    cancel_url: paymentData.cancel_url,
    shipping_method: paymentData.shipping_method || "Courier",
    product_name: paymentData.product_name || "General",
    product_category: paymentData.product_category || "General",
    product_profile: paymentData.product_profile || "general",
    cus_name: paymentData.cus_name,
    cus_email: paymentData.cus_email,
    cus_add1: paymentData.cus_add1 || "",
    cus_city: paymentData.cus_city || "",
    cus_postcode: paymentData.cus_postcode || "",
    cus_country: paymentData.cus_country || "Bangladesh",
    cus_phone: paymentData.cus_phone || "",
  };

  try {
    const response = await axios.post(
      `${baseURL}/gwprocess/v4/api.php`,
      new URLSearchParams(data).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    return response.data;
  } catch (error: any) {
    throw new Error(`SSLCommerz initiation failed: ${error.message}`);
  }
};
