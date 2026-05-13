import express from "express";
const router = express.Router();
import verifyAuth from "../middleware/verifyAuth";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  generateInvoice,
} from "../controllers/orderController";
import { body, param } from "express-validator";

router.use(verifyAuth);

// SRS: POST /api/orders/place
router.post(
  "/place",
  [
    body("shippingAddress").notEmpty().withMessage("Shipping address required"),
    body("shippingAddress.address").notEmpty().withMessage("Address required"),
    body("shippingAddress.city").notEmpty().withMessage("City required"),
    body("paymentMethod")
      .isIn(["SSLCommerz", "Stripe", "bKash", "Cash"])
      .withMessage("Valid payment method required"),
  ],
  createOrder,
);

// SRS: GET /api/orders/my-orders
router.get("/my-orders", getMyOrders);

// SRS: GET /api/orders/:id
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Valid order ID required")],
  getOrderById,
);

// SRS: PATCH /api/orders/cancel/:id
router.patch(
  "/cancel/:id",
  [param("id").isMongoId().withMessage("Valid order ID required")],
  cancelOrder,
);

// Old paths (backward compatible)
router.post(
  "/",
  [
    body("shippingAddress").notEmpty().withMessage("Shipping address required"),
    body("shippingAddress.address").notEmpty().withMessage("Address required"),
    body("shippingAddress.city").notEmpty().withMessage("City required"),
    body("paymentMethod")
      .isIn(["SSLCommerz", "Stripe", "bKash", "Cash"])
      .withMessage("Valid payment method required"),
  ],
  createOrder,
);
router.patch(
  "/:id/cancel",
  [param("id").isMongoId().withMessage("Valid order ID required")],
  cancelOrder,
);
router.get(
  "/:id/invoice",
  [param("id").isMongoId().withMessage("Valid order ID required")],
  generateInvoice,
);

export default router;
