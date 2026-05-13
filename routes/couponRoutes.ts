import express from "express";
const router = express.Router();
import verifyAuth from "../middleware/verifyAuth";
import isAdmin from "../middleware/isAdmin";
import {
  createCoupon,
  getAllCoupons,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from "../controllers/couponController";
import { body, param } from "express-validator";

router.post(
  "/validate",
  verifyAuth,
  [
    body("code")
      .trim()
      .notEmpty()
      .withMessage("Coupon code required")
      .toUpperCase(),
    body("subtotal").optional().isFloat({ min: 0 }),
  ],
  validateCoupon,
);

router.use(verifyAuth, isAdmin);
router.post(
  "/",
  [
    body("code").trim().notEmpty().withMessage("Code required").toUpperCase(),
    body("discountType")
      .isIn(["percentage", "fixed"])
      .withMessage("Invalid discount type"),
    body("discountValue")
      .isFloat({ min: 0 })
      .withMessage("Valid discount value required"),
    body("minPurchase").optional().isFloat({ min: 0 }),
    body("usageLimit").optional().isInt({ min: 1 }),
  ],
  createCoupon,
);
router.get("/", getAllCoupons);
router.put(
  "/:id",
  [param("id").isMongoId().withMessage("Valid ID required")],
  updateCoupon,
);
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Valid ID required")],
  deleteCoupon,
);

export default router;
