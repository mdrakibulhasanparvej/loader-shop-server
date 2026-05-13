import express from "express";
const router = express.Router();
import verifyAuth from "../middleware/verifyAuth";
import {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  applyCoupon,
  clearCart,
} from "../controllers/cartController";
import { body } from "express-validator";

router.use(verifyAuth);

// SRS: GET /api/cart
router.get("/", getCart);

// SRS: POST /api/cart/add
router.post(
  "/add",
  [
    body("productId").isMongoId().withMessage("Valid product ID required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  addToCart,
);

// SRS: PATCH /api/cart/update
router.patch(
  "/update",
  [
    body("productId").isMongoId().withMessage("Valid product ID required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  updateCartItem,
);

// SRS: DELETE /api/cart/remove/:id
router.delete("/remove/:productId", removeFromCart);

// Extra: POST /api/cart/sync (not in BE-3 task)
// router.post("/sync", [body("items").isArray({ min: 1 })], syncCart);

// Old paths (backward compatible)
router.post(
  "/",
  [
    body("productId").isMongoId().withMessage("Valid product ID required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  addToCart,
);
router.patch(
  "/:productId",
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
  ],
  updateCartItem,
);
router.delete("/:productId", removeFromCart);
router.post(
  "/apply-coupon",
  [
    body("code")
      .trim()
      .notEmpty()
      .withMessage("Coupon code required")
      .toUpperCase(),
  ],
  applyCoupon,
);
router.delete("/clear", clearCart);

export default router;
