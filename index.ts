import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import logger from "./utils/logger";

dotenv.config();

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

import { stripeWebhook } from "./controllers/paymentController";
import { validateCoupon } from "./controllers/couponController";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
// import wishlistRoutes from "./routes/wishlistRoutes";
// import addressRoutes from "./routes/addressRoutes";
// import brandRoutes from "./routes/brandRoutes";
// import sellerRoutes from "./routes/sellerRoutes";
// import returnRoutes from "./routes/returnRoutes";
// import newsletterRoutes from "./routes/newsletterRoutes";
// import contactRoutes from "./routes/contactRoutes";
// import taxShippingRoutes from "./routes/taxShippingRoutes";
// import { createReview, getProductReviews } from "./controllers/reviewController";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const mongoURI = process.env.MONGO_URI;

// MongoDB connection state
let mongoConnected = false;

// Function to connect to MongoDB
const connectDB = async () => {
  if (!mongoConnected && mongoURI) {
    try {
      await mongoose.connect(mongoURI);
      mongoConnected = true;
      logger.info("✅ MongoDB connected");
    } catch (error: any) {
      logger.error(`❌ MongoDB connection failed: ${error.message}`);
      mongoConnected = false;
    }
  }
};

// Middleware to ensure DB connection
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!mongoConnected) {
      await connectDB();
    }
    next();
  } catch (err) {
    logger.error(`Middleware error: ${err}`);
    next();
  }
});

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(compression());

// Request logging — colorful in dev, minimal in production
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { skip: (req, res) => res.statusCode < 400 }));
}

// Stripe webhook — needs raw body (must be before JSON parser for this route)
app.post(
  "/api/payment/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook as any,
);

// XSS Protection - Clean user input from malicious scripts
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
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      if (obj && typeof obj === "object") {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitize(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };
    req.body = sanitize(req.body);
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

if (!mongoURI) {
  logger.error("MONGO_URI is required in the .env file.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// bd er jonno comand diye run korte hobe
// mongoose
//   .connect(mongoURI)
//   .then(() => {
//     logger.success("MongoDB connected successfully.");
//     // app.listen(PORT, () => {
//     //   logger.success(`Server running on port ${PORT} http://localhost:5000`);
//     // });
//   })
//   .catch(err => {
//     logger.error(`DB connection error: ${err.message}`);
//     process.exit(1);
//   });

// --- API Endpoints ---

// 1. Product APIs
app.get("/api/products", getProducts);
app.get("/api/products/featured", getFeaturedProducts);
app.get("/api/products/latest", getLatestProducts);
app.get("/api/products/flash-sale", getFlashSaleProducts);
app.get("/api/products/:id", getProductById);
app.post("/api/products", verifyAuth, isAdmin, createProduct);
app.put("/api/products/:id", verifyAuth, isAdmin, updateProduct);
app.delete("/api/products/:id", verifyAuth, isAdmin, deleteProduct);
app.post("/api/products/:id/reviews", verifyAuth, createProductReview);

// // SRS: POST /api/products/:id/review
// app.post("/api/products/:id/review", verifyAuth, createReview);
//
// // SRS: GET /api/products/:id/reviews
// app.get("/api/products/:id/reviews", getProductReviews);
//
// // SRS: POST /api/admin/products
// app.post("/api/admin/products", verifyAuth, isAdmin, createProduct);

// 2. Category APIs
app.get("/api/categories", getCategories);
app.post("/api/categories", verifyAuth, isAdmin, createCategory);

// 3. Core Routes
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);

// 4. Auth & Users
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// 5. Extra Feature Routes (commented — uncomment when frontend needs them)
// app.use("/api/wishlist", wishlistRoutes);
// app.use("/api/addresses", addressRoutes);
// app.use("/api/brands", brandRoutes);
// app.use("/api/sellers", sellerRoutes);
// app.use("/api/returns", returnRoutes);
// app.use("/api/newsletter", newsletterRoutes);
// app.use("/api/contact", contactRoutes);
// app.use("/api/tax-shipping", taxShippingRoutes);

// SRS: GET /api/coupons/validate
app.get("/api/coupons/validate", verifyAuth, validateCoupon);

// 5. Health Check
app.get("/", (req: Request, res: Response) => {
  res.send("Backend is running...");
});

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    logger.dev(`Stack: ${err.stack?.slice(0, 300)}`);
  }
  res.status(500).json({ message: "Internal server error" });
});

// For local development - start server
if (process.env.NODE_ENV !== "production") {
  connectDB().then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  });
}

export default app;
