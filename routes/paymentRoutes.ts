import express from "express";
const router = express.Router();
import verifyAuth from "../middleware/verifyAuth";
import {
  initiateSSLCommerz,
  sslCommerzSuccess,
  sslCommerzFail,
  sslCommerzCancel,
  initiateBkash,
  bkashSuccess,
  bkashFail,
  bkashCancel,
  createStripePaymentIntent,
} from "../controllers/paymentController";
import { body } from "express-validator";

router.use(verifyAuth);

router.post(
  "/initiate",
  [body("orderId").isMongoId().withMessage("Valid order ID required")],
  initiateSSLCommerz,
);
router.post(
  "/ssl-success",
  [
    body("tran_id").notEmpty().withMessage("Transaction ID required"),
    body("val_id").optional(),
  ],
  sslCommerzSuccess,
);
router.post("/ssl-fail", sslCommerzFail);
router.post("/ssl-cancel", sslCommerzCancel);

router.post(
  "/bkash/initiate",
  [body("orderId").isMongoId().withMessage("Valid order ID required")],
  initiateBkash,
);
router.post("/bkash/success", bkashSuccess);
router.post("/bkash/fail", bkashFail);
router.post("/bkash/cancel", bkashCancel);

router.post(
  "/stripe/create-payment-intent",
  [body("orderId").isMongoId().withMessage("Valid order ID required")],
  createStripePaymentIntent,
);

export default router;
