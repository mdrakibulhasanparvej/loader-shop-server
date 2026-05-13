import express from "express";
const router = express.Router();
import verifyAuth from "../middleware/verifyAuth";
import isAdmin from "../middleware/isAdmin";
import {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  updateProductStock,
} from "../controllers/adminController";
import { getAllUsers, updateUserStatus, updateUserRole } from "../controllers/authController";
// Extra (not in BE-3 task):
// import { getActivityLogs, } from "../controllers/adminController";
// import { updateProduct, deleteProduct, } from "../controllers/productController";
// import { deleteCategory } from "../controllers/categoryController";
import { param, query, body } from "express-validator";

router.use(verifyAuth, isAdmin);

// SRS: GET /api/admin/stats
router.get("/stats", getDashboardStats);

// SRS: GET /api/admin/orders
router.get(
  "/orders",
  [
    query("status")
      .optional()
      .isIn(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  getAllOrders,
);

// SRS: PATCH /api/admin/orders/:id/status
router.patch(
  "/orders/:id/status",
  [
    param("id").isMongoId().withMessage("Valid order ID required"),
    body("status")
      .optional()
      .isIn(["Pending", "Processing", "Shipped", "Delivered", "Cancelled"]),
    body("trackingNumber").optional().trim(),
  ],
  updateOrderStatus,
);

// Stock update
router.put(
  "/products/:id/stock",
  [
    param("id").isMongoId().withMessage("Valid product ID required"),
    body("stock").isInt({ min: 0 }).withMessage("Valid stock value required"),
  ],
  updateProductStock,
);

// Admin user management
router.get("/users", getAllUsers);
router.patch(
  "/users/:id/status",
  [
    param("id").isMongoId().withMessage("Valid user ID required"),
    body("status").isIn(["active", "blocked"]).withMessage("Status must be active or blocked"),
  ],
  updateUserStatus,
);
router.patch(
  "/users/:id/role",
  [
    param("id").isMongoId().withMessage("Valid user ID required"),
    body("role").isIn(["customer", "seller", "admin"]).withMessage("Role must be customer, seller, or admin"),
  ],
  updateUserRole,
);

// Extra routes (not in BE-3 task):
// router.put("/products/:id", [param("id").isMongoId()], updateProduct);
// router.delete("/products/:id", [param("id").isMongoId()], deleteProduct);
// router.get("/logs", getActivityLogs);
// router.delete("/categories/:id", [param("id").isMongoId()], deleteCategory);

export default router;
