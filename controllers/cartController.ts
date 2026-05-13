import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import Cart from "../models/Cart";
import Product from "../models/Product";
import Coupon from "../models/Coupon";
import ApiResponse from "../utils/ApiResponse";
import { AuthRequest } from "../middleware/verifyAuth";

export const getCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const cart = await Cart.findOne({ user: req.user!._id }).populate(
      "items.product",
    );
    if (!cart)
      return res.json(
        ApiResponse.success({ items: [], coupon: null }, "Cart fetched"),
      );
    res.json(ApiResponse.success(cart, "Cart fetched"));
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { productId, quantity } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json(ApiResponse.error("Product not found"));

    if (product.stock < quantity) {
      return res.status(400).json(ApiResponse.error("Insufficient stock"));
    }

    let cart = await Cart.findOne({ user: req.user!._id });
    if (!cart) cart = new Cart({ user: req.user!._id, items: [] });

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate("items.product");

    res.json(ApiResponse.success(cart, "Product added to cart"));
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const productId = req.params.productId || req.params.id;
    const cart = await Cart.findOne({ user: req.user!._id });
    if (!cart) return res.status(404).json(ApiResponse.error("Cart not found"));

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId,
    );
    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate("items.product");

    res.json(ApiResponse.success(cart, "Product removed from cart"));
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const productId = req.params.productId || req.body.productId;
    const { quantity } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json(ApiResponse.error("Product not found"));

    if (product.stock < quantity) {
      return res.status(400).json(ApiResponse.error("Insufficient stock"));
    }

    const cart = await Cart.findOne({ user: req.user!._id });
    if (!cart) return res.status(404).json(ApiResponse.error("Cart not found"));

    const item = cart.items.find(
      (item) => item.product.toString() === productId,
    );
    if (!item)
      return res.status(404).json(ApiResponse.error("Item not in cart"));

    item.quantity = quantity;
    cart.updatedAt = new Date();
    await cart.save();
    await cart.populate("items.product");

    res.json(ApiResponse.success(cart, "Cart updated"));
  } catch (error) {
    next(error);
  }
};

export const applyCoupon = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon)
      return res.status(404).json(ApiResponse.error("Invalid coupon code"));

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json(ApiResponse.error("Coupon expired"));
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res
        .status(400)
        .json(ApiResponse.error("Coupon usage limit reached"));
    }

    const cart = await Cart.findOne({ user: req.user!._id }).populate(
      "items.product",
    );
    if (!cart || cart.items.length === 0) {
      return res.status(400).json(ApiResponse.error("Cart is empty"));
    }

    const subtotal = cart.items.reduce(
      (sum: number, item: any) => sum + item.product.price * item.quantity,
      0,
    );
    if (subtotal < coupon.minPurchase) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            `Minimum purchase ${coupon.minPurchase} BDT required`,
          ),
        );
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }

    cart.coupon = { code: coupon.code, discount };
    cart.updatedAt = new Date();
    await cart.save();

    res.json(ApiResponse.success(cart, "Coupon applied"));
  } catch (error) {
    next(error);
  }
};

// Extra (not in BE-3 task):
// export const syncCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
//   try {
//     const { items } = req.body;
//     if (!Array.isArray(items)) return res.status(400).json(ApiResponse.error("Items must be an array"));
//     for (const item of items) {
//       if (!item.productId || !item.quantity || item.quantity < 1) return res.status(400).json(ApiResponse.error("Each item needs productId and quantity (min 1)"));
//       const product = await Product.findById(item.productId);
//       if (!product) return res.status(404).json(ApiResponse.error(`Product ${item.productId} not found`));
//     }
//     let cart = await Cart.findOne({ user: req.user!._id });
//     if (!cart) cart = new Cart({ user: req.user!._id, items: [] });
//     cart.items = items.map((item: any) => ({ product: item.productId, quantity: item.quantity }));
//     cart.coupon = undefined; cart.updatedAt = new Date(); await cart.save();
//     await cart.populate("items.product");
//     res.json(ApiResponse.success(cart, "Cart synced successfully"));
//   } catch (error) { next(error); }
// };

export const clearCart = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const cart = await Cart.findOne({ user: req.user!._id });
    if (cart) {
      cart.items = [];
      cart.coupon = undefined;
      cart.updatedAt = new Date();
      await cart.save();
    }
    res.json(ApiResponse.success(null, "Cart cleared"));
  } catch (error) {
    next(error);
  }
};
