import { Router } from "express";
import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/authController";
import verifyAuth from "../middleware/verifyAuth";

const router = Router();

router.get("/profile", verifyAuth, getMyProfile);
router.patch("/update-profile", verifyAuth, updateMyProfile);

export default router;
