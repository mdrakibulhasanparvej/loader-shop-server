import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import axios from "axios";
import Order from "../models/Order";
import TransactionLog from "../models/TransactionLog";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { initiateSSLCommerzPayment } from "../services/sslCommerz";
import { initiateBkashPayment, executeBkashPayment } from "../services/bKash";
import {
  createPaymentIntent,
  constructWebhookEvent,
} from "../services/stripePayment";
import type { IUser } from "../models/User";

type PopulatedUser = Pick<IUser, "_id" | "name" | "email" | "phone">;

export const initiateSSLCommerz = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(
          ApiResponse.error("Validation failed", { errors: errors.array() }),
        );
    }

    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("user", "name email phone");

    if (!order)
      return res.status(404).json(ApiResponse.error("Order not found"));
    if (order.isPaid)
      return res.status(400).json(ApiResponse.error("Order already paid"));

    const cus = order.user as unknown as PopulatedUser;

    const paymentData = {
      total_amount: order.totalPrice,
      currency: "BDT",
      tran_id: order._id.toString(),
      success_url: `${process.env.FRONTEND_URL}/payment/success`,
      fail_url: `${process.env.FRONTEND_URL}/payment/fail`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      shipping_method: "Courier",
      product_name: "Order Payment",
      product_category: "General",
      product_profile: "general",
      cus_name: cus.name,
      cus_email: cus.email,
      cus_add1: order.shippingAddress.address,
      cus_city: order.shippingAddress.city,
      cus_postcode: order.shippingAddress.postalCode,
      cus_country: "Bangladesh",
      cus_phone: cus.phone || "01700000000",
    };

    const sslResponse = await initiateSSLCommerzPayment(paymentData);
    res.json(
      ApiResponse.success(
        { paymentUrl: (sslResponse as any).GatewayPageURL },
        "Payment initiated",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const sslCommerzSuccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(
          ApiResponse.error("Validation failed", { errors: errors.array() }),
        );
    }

    const { tran_id, val_id } = req.body;

    const order = await Order.findById(tran_id);
    if (!order)
      return res.status(404).json(ApiResponse.error("Order not found"));

    if (val_id) {
      try {
        const isLive = process.env.IS_LIVE === "true";
        const baseURL = isLive
          ? "https://securepay.sslcommerz.com"
          : "https://sandbox.sslcommerz.com";
        const verifyResponse = await axios.get(
          `${baseURL}/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.STORE_ID}&store_passwd=${process.env.STORE_PASSWORD}&v=1&format=json`,
        );

        if (
          (verifyResponse.data as any).status !== "VALID" &&
          (verifyResponse.data as any).status !== "VALIDATED"
        ) {
          return res
            .status(400)
            .json(ApiResponse.error("Payment verification failed"));
        }
      } catch (verifyError: any) {
        return res
          .status(400)
          .json(ApiResponse.error("Payment verification failed"));
      }
    }

    order.isPaid = true;
    order.paidAt = Date.now() as any;
    order.paymentResult = {
      id: tran_id,
      status: "completed",
      update_time: new Date().toString(),
      email_address: val_id,
    };
    order.orderStatus = "Processing";

    await order.save();

    await TransactionLog.create({
      user: (order as any).user,
      order: order._id,
      type: "payment",
      gateway: "sslcommerz",
      transactionId: val_id || tran_id,
      amount: order.totalPrice,
      status: "success",
    });

    res.json(ApiResponse.success(order, "Payment successful"));
  } catch (error) {
    next(error);
  }
};

export const sslCommerzFail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tran_id } = req.body;
    await TransactionLog.create({
      order: tran_id,
      type: "payment",
      gateway: "sslcommerz",
      transactionId: tran_id || "unknown",
      amount: 0,
      status: "failed",
      details: "Payment failed on SSLCommerz page",
    });
    res.status(400).json(ApiResponse.error("Payment failed", { tran_id }));
  } catch (error) {
    next(error);
  }
};

export const sslCommerzCancel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tran_id } = req.body;
    await TransactionLog.create({
      order: tran_id,
      type: "payment",
      gateway: "sslcommerz",
      transactionId: tran_id || "unknown",
      amount: 0,
      status: "failed",
      details: "Payment cancelled by user on SSLCommerz page",
    });
    res.json(ApiResponse.error("Payment cancelled", { tran_id }));
  } catch (error) {
    next(error);
  }
};

export const initiateBkash = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json(ApiResponse.error("Order not found"));
    }
    if (order.isPaid) {
      return res.status(400).json(ApiResponse.error("Order already paid"));
    }

    const bkashCus = order.user as unknown as PopulatedUser;

    const result = await initiateBkashPayment({
      total_amount: order.totalPrice,
      currency: "BDT",
      merchantInvoiceNumber: order._id.toString(),
      success_url: `${process.env.FRONTEND_URL}/payment/bkash/success?orderId=${order._id}`,
      fail_url: `${process.env.FRONTEND_URL}/payment/bkash/fail?orderId=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/bkash/cancel?orderId=${order._id}`,
      cus_name: bkashCus.name || "Customer",
      cus_email: bkashCus.email || "",
      cus_phone: bkashCus.phone || "01700000000",
    });

    res.json(
      ApiResponse.success(
        {
          paymentUrl: (result as any).bkashURL,
          paymentID: (result as any).paymentID,
        },
        "bKash payment initiated",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const bkashSuccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { paymentID, orderId, status } = req.body;

    if (status !== "success") {
      return res
        .status(400)
        .json(ApiResponse.error("bKash payment not successful"));
    }

    const executeResult = await executeBkashPayment(paymentID);
    if ((executeResult as any).transactionStatus !== "Completed") {
      return res
        .status(400)
        .json(ApiResponse.error("bKash payment execution failed"));
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json(ApiResponse.error("Order not found"));
    }

    order.isPaid = true;
    order.paidAt = new Date() as any;
    order.paymentResult = {
      id: paymentID,
      status: "completed",
      update_time: new Date().toString(),
      email_address: (executeResult as any).customerMsisdn || "",
    };
    order.orderStatus = "Processing";
    await order.save();

    await TransactionLog.create({
      user: order.user,
      order: order._id,
      type: "payment",
      gateway: "bkash",
      transactionId: paymentID,
      amount: order.totalPrice,
      status: "success",
    });

    res.json(ApiResponse.success(order, "bKash payment successful"));
  } catch (error) {
    next(error);
  }
};

export const bkashFail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.body;
    await TransactionLog.create({
      order: orderId,
      type: "payment",
      gateway: "bkash",
      transactionId: "unknown",
      amount: 0,
      status: "failed",
      details: "bKash payment failed",
    });
    res
      .status(400)
      .json(ApiResponse.error("bKash payment failed", { orderId }));
  } catch (error) {
    next(error);
  }
};

export const bkashCancel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.body;
    await TransactionLog.create({
      order: orderId,
      type: "payment",
      gateway: "bkash",
      transactionId: "unknown",
      amount: 0,
      status: "failed",
      details: "bKash payment cancelled by user",
    });
    res.json(ApiResponse.error("bKash payment cancelled", { orderId }));
  } catch (error) {
    next(error);
  }
};

export const createStripePaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("user", "name email");

    if (!order) {
      return res.status(404).json(ApiResponse.error("Order not found"));
    }
    if (order.isPaid) {
      return res.status(400).json(ApiResponse.error("Order already paid"));
    }

    const stripeCus = order.user as unknown as PopulatedUser;
    const result = await createPaymentIntent({
      amount: order.totalPrice,
      orderId: order._id.toString(),
      customerEmail: stripeCus.email,
    });

    res.json(
      ApiResponse.success(
        {
          clientSecret: result.clientSecret,
          paymentIntentId: result.paymentIntentId,
        },
        "Stripe payment intent created",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const stripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sig = req.headers["stripe-signature"] as string;

    let event: any;
    try {
      event = constructWebhookEvent(req.body, sig);
    } catch (err: any) {
      return res
        .status(400)
        .json(ApiResponse.error("Webhook signature verification failed"));
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      const order = await Order.findById(orderId);
      if (order && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date() as any;
        order.paymentResult = {
          id: paymentIntent.id,
          status: "completed",
          update_time: new Date().toString(),
          email_address: paymentIntent.receipt_email || "",
        };
        order.orderStatus = "Processing";
        await order.save();

        await TransactionLog.create({
          user: order.user,
          order: order._id,
          type: "payment",
          gateway: "stripe",
          transactionId: paymentIntent.id,
          amount: order.totalPrice,
          status: "success",
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      logger.error("Stripe payment failed:", paymentIntent.id);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};
