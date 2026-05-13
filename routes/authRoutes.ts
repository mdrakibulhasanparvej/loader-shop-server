import { Router } from "express";
import {
  register,
  login,
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
} from "../controllers/authController";
import verifyAuth from "../middleware/verifyAuth";
import isAdmin from "../middleware/isAdmin";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", verifyAuth, getMyProfile);
router.put("/profile", verifyAuth, updateMyProfile);

router.get("/users", verifyAuth, isAdmin, getAllUsers);
router.patch("/users/:id/status", verifyAuth, isAdmin, updateUserStatus);
router.patch("/users/:id/role", verifyAuth, isAdmin, updateUserRole);

export default router;
