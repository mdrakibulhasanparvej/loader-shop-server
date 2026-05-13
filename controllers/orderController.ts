import mongoose from "mongoose";
import { Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import Order from "../models/Order";
import Product from "../models/Product";
import Cart from "../models/Cart";
import ApiResponse from "../utils/ApiResponse";
import { initiateSSLCommerzPayment } from "../services/sslCommerz";
import { initiateBkashPayment } from "../services/bKash";
import { createPaymentIntent } from "../services/stripePayment";
import PDFDocument from "pdfkit";
import { AuthRequest } from "../middleware/verifyAuth";
import type { IUser } from "../models/User";
import type { IProduct } from "../models/Product";

type PopulatedUser = Pick<IUser, "_id" | "name" | "email" | "phone">;
type PopulatedProduct = Pick<IProduct, "_id" | "name" | "price" | "images" | "stock">;

const getShippingPrice = (city: string): number => {
  if (!city) return 120;
  const dhaka = ["Dhaka", "DHAKA", "ঢাকা"];
  return dhaka.includes(city.trim()) ? 60 : 120;
};

export const createOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json(ApiResponse.error("Validation failed", { errors: errors.array() }));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res
        .status(400)
        .json(
          ApiResponse.error("Shipping address and payment method required"),
        );
    }

    const userId = req.user!._id;
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json(ApiResponse.error("Cart is empty"));
    }

    const orderItems: {
      product: string;
      name: string;
      image: string;
      price: number;
      quantity: number;
    }[] = [];
    let itemsPrice = 0;

    for (const item of cart.items) {
      const populatedProduct = item.product as unknown as PopulatedProduct;
      const product = await Product.findOneAndUpdate(
        { _id: populatedProduct._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session },
      );

      if (!product) {
        throw new Error(`Insufficient stock for ${populatedProduct.name}`);
      }

      const price = product.price;
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || "",
        price,
        quantity: item.quantity,
      });
      itemsPrice += price * item.quantity;
    }

    const shippingPrice = getShippingPrice(shippingAddress?.city);
    const taxPrice = 0;
    const couponDiscount = cart.coupon?.discount || 0;
    const totalPrice = itemsPrice + shippingPrice + taxPrice - couponDiscount;

    const order = await Order.create(
      [
        {
          user: userId,
          orderItems,
          shippingAddress,
          paymentMethod,
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice: Math.max(totalPrice, 0),
          couponDiscount,
          isPaid: false,
          orderStatus: "Pending",
        },
      ],
      { session },
    );

    cart.items = [];
    cart.coupon = undefined;
    await cart.save({ session });

    await session.commitTransaction();

    const customerName = req.user?.name || "Customer";
    const customerEmail = req.user?.email || `${userId}@example.com`;
    const customerPhone =
      shippingAddress.phone || req.user?.phone || "01700000000";

    if (paymentMethod === "SSLCommerz") {
      const paymentData = {
        total_amount: order[0].totalPrice,
        currency: "BDT",
        tran_id: order[0]._id.toString(),
        success_url: `${process.env.FRONTEND_URL}/payment/success`,
        fail_url: `${process.env.FRONTEND_URL}/payment/fail`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        shipping_method: "Courier",
        product_name: `Order #${order[0]._id}`,
        product_category: "General",
        product_profile: "general",
        cus_name: customerName,
        cus_email: customerEmail,
        cus_add1: shippingAddress.address,
        cus_city: shippingAddress.city,
        cus_postcode: shippingAddress.postalCode,
        cus_country: "Bangladesh",
        cus_phone: customerPhone,
      };

      try {
        const sslResponse = await initiateSSLCommerzPayment(paymentData);
        return res.status(200).json(
          ApiResponse.success(
            {
              order: order[0],
              paymentUrl: (sslResponse as any).GatewayPageURL,
            },
            "Payment initiated",
          ),
        );
      } catch (error: any) {
        await Order.findByIdAndDelete(order[0]._id);
        return res
          .status(500)
          .json(
            ApiResponse.error(`Payment initiation failed: ${error.message}`),
          );
      }
    }

    if (paymentMethod === "bKash") {
      try {
        const bkashResult = await initiateBkashPayment({
          total_amount: order[0].totalPrice,
          currency: "BDT",
          merchantInvoiceNumber: order[0]._id.toString(),
          success_url: `${process.env.FRONTEND_URL}/payment/bkash/success?orderId=${order[0]._id}`,
          fail_url: `${process.env.FRONTEND_URL}/payment/bkash/fail?orderId=${order[0]._id}`,
          cancel_url: `${process.env.FRONTEND_URL}/payment/bkash/cancel?orderId=${order[0]._id}`,
          cus_name: customerName,
          cus_email: customerEmail,
          cus_phone: customerPhone,
        });

        return res.status(200).json(
          ApiResponse.success(
            {
              order: order[0],
              paymentUrl: (bkashResult as any).bkashURL,
              paymentID: (bkashResult as any).paymentID,
            },
            "bKash payment initiated",
          ),
        );
      } catch (error: any) {
        await Order.findByIdAndDelete(order[0]._id);
        return res
          .status(500)
          .json(
            ApiResponse.error(
              `bKash payment initiation failed: ${error.message}`,
            ),
          );
      }
    }

    if (paymentMethod === "Stripe") {
      try {
        const stripeResult = await createPaymentIntent({
          amount: order[0].totalPrice,
          orderId: order[0]._id.toString(),
        });

        return res.status(200).json(
          ApiResponse.success(
            {
              order: order[0],
              clientSecret: stripeResult.clientSecret,
              paymentIntentId: stripeResult.paymentIntentId,
            },
            "Stripe payment initiated",
          ),
        );
      } catch (error: any) {
        await Order.findByIdAndDelete(order[0]._id);
        return res
          .status(500)
          .json(
            ApiResponse.error(
              `Stripe payment initiation failed: ${error.message}`,
            ),
          );
      }
    }

    res
      .status(201)
      .json(ApiResponse.success(order[0], "Order created successfully"));
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export const getMyOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: userId })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ user: userId });

    res.json(
      ApiResponse.successWithPagination(
        orders,
        {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
        "Orders fetched successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email phone",
    );
    if (!order)
      return res.status(404).json(ApiResponse.error("Order not found"));
    res.json(ApiResponse.success(order, "Order fetched successfully"));
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(
          ApiResponse.error("Validation failed", { errors: errors.array() }),
        );
    }

    const userId = req.user!._id;
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json(ApiResponse.error("Order not found"));

    if (order.user.toString() !== userId?.toString()) {
      return res.status(403).json(ApiResponse.error("Not authorized"));
    }

    if (order.orderStatus !== "Pending") {
      return res
        .status(400)
        .json(ApiResponse.error("Only pending orders can be cancelled"));
    }

    order.orderStatus = "Cancelled";
    order.set("cancelledAt", Date.now());
    await order.save();

    for (const item of order.orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } },
        { new: true },
      );
    }

    res.json(ApiResponse.success(order, "Order cancelled"));
  } catch (error) {
    next(error);
  }
};

export const generateInvoice = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json(
          ApiResponse.error("Validation failed", { errors: errors.array() }),
        );
    }

    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!order)
      return res.status(404).json(ApiResponse.error("Order not found"));

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const filename = `invoice-${order._id}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Date: ${order.createdAt.toDateString()}`);
    const customer = order.user as unknown as PopulatedUser;
    doc.text(`Customer: ${customer.name} <${customer.email}>`);
    doc.moveDown();
    doc.text("Items:");
    order.orderItems.forEach((item: any) => {
      doc.text(
        `${item.name} x ${item.quantity} = ${item.price * item.quantity} BDT`,
      );
    });
    doc.moveDown();
    doc.text(`Subtotal: ${order.itemsPrice} BDT`);
    doc.text(`Shipping: ${order.shippingPrice} BDT`);
    doc.text(`Discount: -${order.couponDiscount} BDT`);
    doc.text(`Total: ${order.totalPrice} BDT`, { underline: true });
    doc.end();
  } catch (error) {
    next(error);
  }
};
