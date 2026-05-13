import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import Order from "../models/Order";
import Product from "../models/Product";
import ApiResponse from "../utils/ApiResponse";
// Extra models (not in BE-3 task):
// import User from "../models/User";
// import Seller from "../models/Seller";
// import ActivityLog from "../models/ActivityLog";
// import { logActivity } from "../utils/activityLogger";

const validOrderTransitions: Record<string, string[]> = {
  Pending: ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export const getDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({
      orderStatus: "Pending",
    });
    const totalProducts = await Product.countDocuments();

    const totalRevenue = await Order.aggregate([
      { $match: { orderStatus: "Delivered", isPaid: true } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    const orderDistribution = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesReport = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const lowStockProducts = await Product.find({ stock: { $lt: 10 } }).select(
      "name stock",
    );

    res.json(
      ApiResponse.success(
        {
          totalOrders,
          pendingOrders,
          totalProducts,
          totalRevenue: totalRevenue[0]?.total || 0,
          orderDistribution: orderDistribution.reduce(
            (acc: Record<string, number>, item: any) => {
              acc[item._id] = item.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
          salesReport,
          lowStockProducts,
        },
        "Dashboard stats fetched",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    const filter: any = {};
    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

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

export const updateOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json(ApiResponse.error("Order not found"));

    const allowedNext = validOrderTransitions[order.orderStatus] || [];
    if (status && !allowedNext.includes(status)) {
      return res
        .status(400)
        .json(
          ApiResponse.error(
            `Cannot change status from "${order.orderStatus}" to "${status}". Allowed transitions: ${allowedNext.join(", ") || "none"}`,
          ),
        );
    }

    if (status === "Cancelled" && order.orderStatus !== "Cancelled") {
      for (const item of order.orderItems) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { new: true },
        );
      }
    }

    order.orderStatus = status || order.orderStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === "Delivered") order.deliveredAt = Date.now() as any;

    await order.save();

    res.json(ApiResponse.success(order, "Order status updated"));
  } catch (error) {
    next(error);
  }
};

export const updateProductStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { stock } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { stock },
      { new: true },
    );
    if (!product)
      return res.status(404).json(ApiResponse.error("Product not found"));

    res.json(ApiResponse.success(product, "Stock updated successfully"));
  } catch (error) {
    next(error);
  }
};

// Extra (not in BE-3 task):
// export const getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 20;
//     const skip = (page - 1) * limit;
//     const logs = await ActivityLog.find().populate("admin", "name email").sort("-createdAt").skip(skip).limit(limit);
//     const total = await ActivityLog.countDocuments();
//     res.json(ApiResponse.successWithPagination(logs, { totalItems: total, totalPages: Math.ceil(total / limit), currentPage: page, limit }, "Activity logs fetched"));
//   } catch (error) { next(error); }
// };
