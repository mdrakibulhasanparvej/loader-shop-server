import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import Coupon from "../models/Coupon";
import ApiResponse from "../utils/ApiResponse";

export const createCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      expiresAt,
      usageLimit,
    } = req.body;

    const existing = await Coupon.findOne({ code });
    if (existing)
      return res
        .status(400)
        .json(ApiResponse.error("Coupon code already exists"));

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      minPurchase: minPurchase || 0,
      maxDiscount,
      expiresAt,
      usageLimit,
      isActive: true,
    });

    res
      .status(201)
      .json(ApiResponse.success(coupon, "Coupon created successfully"));
  } catch (error) {
    next(error);
  }
};

export const getAllCoupons = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find()
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
    const total = await Coupon.countDocuments();

    res.json(
      ApiResponse.successWithPagination(
        coupons,
        {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
        "Coupons fetched successfully",
      ),
    );
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      "code",
      "discountType",
      "discountValue",
      "minPurchase",
      "maxDiscount",
      "expiresAt",
      "usageLimit",
      "isActive",
      "applicableProducts",
    ];
    const update: any = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        update[field] =
          field === "code" ? req.body[field].toUpperCase() : req.body[field];
      }
    });

    const coupon = await Coupon.findByIdAndUpdate(id, update, { new: true });
    if (!coupon)
      return res.status(404).json(ApiResponse.error("Coupon not found"));

    res.json(ApiResponse.success(coupon, "Coupon updated successfully"));
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon)
      return res.status(404).json(ApiResponse.error("Coupon not found"));

    res.json(ApiResponse.success(null, "Coupon deleted"));
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const code = req.body.code || (req.query.code as string);
    const subtotal = req.body.subtotal || Number(req.query.subtotal) || 0;

    if (!code) {
      return res.status(400).json(ApiResponse.error("Coupon code required"));
    }

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon)
      return res.status(404).json(ApiResponse.error("Invalid coupon"));

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json(ApiResponse.error("Coupon expired"));
    }

    if (subtotal && subtotal < coupon.minPurchase) {
      return res
        .status(400)
        .json(
          ApiResponse.error(`Min purchase ${coupon.minPurchase} BDT required`),
        );
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.discountValue;
    }

    coupon.usedCount += 1;
    await coupon.save();

    res.json(
      ApiResponse.success({ coupon, discount }, "Coupon applied successfully"),
    );
  } catch (error) {
    next(error);
  }
};
