import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import logger from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "loader_shop_jwt_secret_2026";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: "customer" | "seller" | "admin";
    status: "active" | "blocked";
  };
}

const verifyAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
    }

    // Check if token is an Admin Secret (for Postman testing without JWT)
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (ADMIN_SECRET && token === ADMIN_SECRET) {
      const adminUser = await User.findOne({ role: "admin" });
      if (adminUser) {
        req.user = {
          _id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: "admin",
          status: adminUser.status,
        };
        return next();
      }
      req.user = {
        _id: "000000000000000000000000",
        name: "Admin",
        email: "admin@example.com",
        role: "admin",
        status: "active",
      };
      return next();
    }

    // Real JWT verification
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError: any) {
      // Fallback: check if token is a raw user ID (Postman testing)
      const isObjectId = /^[a-fA-F0-9]{24}$/.test(token);
      if (isObjectId) {
        const testUser = await User.findById(token).select("-password");
        if (testUser) {
          req.user = {
            _id: testUser._id.toString(),
            name: testUser.name,
            email: testUser.email,
            phone: testUser.phone,
            role: testUser.role,
            status: testUser.status,
          };
          return next();
        }
      }
      logger.error("JWT verification failed:", jwtError.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again.",
      });
    }

    const userId = decoded.userId || decoded._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload.",
      });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact support.",
      });
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error: any) {
    logger.error("Auth middleware error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication failed. Please try again.",
    });
  }
};

export default verifyAuth;
