import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import logger from "./utils/logger";

// Controllers & Middleware Imports
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getFeaturedProducts,
  getLatestProducts,
  getFlashSaleProducts,
} from "./controllers/productController";
import {
  getCategories,
  createCategory,
} from "./controllers/categoryController";
import verifyAuth from "./middleware/verifyAuth";
import isAdmin from "./middleware/isAdmin";
import cartRoutes from "./routes/cartRoutes";
import couponRoutes from "./routes/couponRoutes";
import orderRoutes from "./routes/orderRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import { stripeWebhook } from "./controllers/paymentController";
import { validateCoupon } from "./controllers/couponController";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const mongoURI = process.env.MONGO_URI;

// ১. Vercel/Proxy সেটিংস (Rate Limit এর এরর ঠিক করার জন্য)
app.set('trust proxy', 1);

// MongoDB Connection Logic
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  if (!mongoURI) {
    logger.error("❌ MONGO_URI is missing in .env file");
    return;
  }
  try {
    await mongoose.connect(mongoURI);
    logger.info("✅ MongoDB connected");
  } catch (error: any) {
    logger.error(`❌ MongoDB connection failed: ${error.message}`);
  }
};

// ২. স্টাইপ ওয়েব-হুক (এটি অবশ্যই JSON পার্সারের আগে থাকতে হবে)
app.post(
  "/api/payment/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook as any
);

// Standard Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(compression());

// Request logging
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { skip: (req, res) => res.statusCode < 400 }));
}

// ৩. DB কানেকশন নিশ্চিত করার মিডলওয়্যার (Vercel সার্ভারলেস ফাংশনের জন্য জরুরি)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  await connectDB();
  next();
});

// ৪. কাস্টম XSS Protection
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    const sanitize = (obj: any): any => {
      if (typeof obj === "string") {
        return obj
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;");
      }
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj && typeof obj === "object") {
        const sanitized: any = {};
        for (const key in obj) sanitized[key] = sanitize(obj[key]);
        return sanitized;
      }
      return obj;
    };
    req.body = sanitize(req.body);
  }
  next();
});

// ৫. Rate Limiting (এখন সঠিক IP চিনতে পারবে)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// --- API Endpoints ---

// Product Routes
app.get("/api/products", getProducts);
app.get("/api/products/featured", getFeaturedProducts);
app.get("/api/products/latest", getLatestProducts);
app.get("/api/products/flash-sale", getFlashSaleProducts);
app.get("/api/products/:id", getProductById);
app.post("/api/products", verifyAuth, isAdmin, createProduct);
app.put("/api/products/:id", verifyAuth, isAdmin, updateProduct);
app.delete("/api/products/:id", verifyAuth, isAdmin, deleteProduct);
app.post("/api/products/:id/reviews", verifyAuth, createProductReview);

// Category Routes
app.get("/api/categories", getCategories);
app.post("/api/categories", verifyAuth, isAdmin, createCategory);

// Core Feature Routes
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/api/coupons/validate", verifyAuth, validateCoupon);

// Health Check
app.get("/", (req: Request, res: Response) => {
  res.send("Loader Shop Backend is running...");
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`);
  res.status(500).json({ message: "Internal server error" });
});

// Local development Server Start
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  });
}

export default app;