import { Request, Response } from "express";
import { SortOrder } from "mongoose";
import Product from "../models/Product";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { normalizeImageUrls, createSlugFromName } from "../utils/imageUtils";
import { body, validationResult } from "express-validator";
import { AuthRequest } from "../middleware/verifyAuth";

const buildQuery = (req: Request) => {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const category =
    typeof req.query.category === "string" ? req.query.category.trim() : "";
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  const rating = Number(req.query.rating);

  const query: Record<string, unknown> = {};

  if (search) {
    query.$text = { $search: search };
  }

  if (category) query.category = category;
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    const priceFilter: Record<string, number> = {};
    if (!Number.isNaN(minPrice)) priceFilter.$gte = minPrice;
    if (!Number.isNaN(maxPrice)) priceFilter.$lte = maxPrice;
    query.price = priceFilter;
  }

  if (!Number.isNaN(rating)) query.rating = { $gte: rating };
  return query;
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const sort = typeof req.query.sort === "string" ? req.query.sort : "";

    const query = buildQuery(req);
    const skip = (page - 1) * limit;
    const sortOptions: Record<string, SortOrder> = { createdAt: -1 };

    if (sort === "priceLow") sortOptions.price = 1;
    if (sort === "priceHigh") sortOptions.price = -1;
    if (sort === "ratingHigh") sortOptions.rating = -1;
    if (sort === "ratingLow") sortOptions.rating = 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean();
    const total = await Product.countDocuments(query);

    res.json(
      ApiResponse.successWithPagination(
        products,
        {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
        "Products fetched successfully",
      ),
    );
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error fetching products"));
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json(ApiResponse.error("Product not found"));
    }
    res.json(ApiResponse.success(product, "Product fetched successfully"));
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error fetching product"));
  }
};

export const createProduct = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("price")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number"),
  body("stock")
    .isInt({ min: 0 })
    .withMessage("Stock must be a non-negative integer"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("images")
    .isArray({ min: 1 })
    .withMessage("At least one image is required"),
  body("sku").optional().trim().notEmpty().withMessage("SKU is required"),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error(
            errors
              .array()
              .map((e) => e.msg)
              .join(", "),
          ),
        );
      }

      const {
        name,
        description,
        price,
        discountPrice,
        stock,
        category,
        subCategory,
        images,
        featured,
        sku: rawSku,
      } = req.body;

      const sku = rawSku || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      const imageUrls = normalizeImageUrls(images);
      if (imageUrls.length === 0) {
        return res
          .status(400)
          .json(ApiResponse.error("At least one image URL is required"));
      }

      const product = new Product({
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        discountPrice:
          discountPrice != null ? Number(discountPrice) : undefined,
        stock: Number(stock),
        category: category.trim(),
        subCategory:
          typeof subCategory === "string" ? subCategory.trim() : subCategory,
        images: imageUrls,
        featured: Boolean(featured),
        sku: sku.trim(),
        slug: createSlugFromName(name),
      });

      await product.save();
      res
        .status(201)
        .json(ApiResponse.success(product, "Product created successfully"));
    } catch (error) {
      logger.error(error.message);
      res.status(500).json(ApiResponse.error("Error creating product"));
    }
  },
];

export const updateProduct = [
  body("price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price must be positive"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be non-negative"),
  body("discountPrice")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Discount price must be positive"),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          ApiResponse.error(
            errors
              .array()
              .map((e) => e.msg)
              .join(", "),
          ),
        );
      }

      const updateData: Record<string, unknown> = { ...req.body };

      if (typeof updateData.name === "string") {
        updateData.name = updateData.name.trim();
        updateData.slug = createSlugFromName(updateData.name as string);
      }

      if (updateData.images) {
        updateData.images = normalizeImageUrls(updateData.images);
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      ).lean();

      if (!product) {
        return res.status(404).json(ApiResponse.error("Product not found"));
      }

      res.json(ApiResponse.success(product, "Product updated successfully"));
    } catch (error) {
      logger.error(error.message);
      res.status(500).json(ApiResponse.error("Error updating product"));
    }
  },
];

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id).lean();
    if (!product) {
      return res.status(404).json(ApiResponse.error("Product not found"));
    }
    res.json(ApiResponse.success(null, "Product deleted"));
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error deleting product"));
  }
};

export const createProductReview = async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment, name } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json(ApiResponse.error("Product not found"));
    }

    const user = req.user;
    const numericRating = Number(rating);

    if (
      rating == null ||
      Number.isNaN(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res
        .status(400)
        .json(ApiResponse.error("Rating must be a number between 1 and 5"));
    }

    const review = {
      name: user?.name || name || "Guest",
      rating: numericRating,
      comment: typeof comment === "string" ? comment.trim() : "",
      user: user?._id,
    };

    const newAverageRating =
      (product.rating * product.numReviews + numericRating) /
      (product.numReviews + 1);

    await Product.findByIdAndUpdate(
      req.params.id,
      {
        $push: { reviews: review },
        $inc: { numReviews: 1 },
        $set: { rating: newAverageRating },
      },
      { new: true },
    );

    res.status(201).json(ApiResponse.success(null, "Review added"));
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error adding review"));
  }
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ featured: true }).limit(8).lean();
    res.json(ApiResponse.success(products, "Featured products fetched"));
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error fetching featured products"));
  }
};

export const getLatestProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    res.json(ApiResponse.success(products, "Latest products fetched"));
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error fetching latest products"));
  }
};

export const getFlashSaleProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({
      discountPrice: { $exists: true, $gt: 0 },
    })
      .limit(8)
      .lean();
    res.json(ApiResponse.success(products, "Flash sale products fetched"));
  } catch (error) {
    logger.error(error.message);
    res
      .status(500)
      .json(ApiResponse.error("Error fetching flash sale products"));
  }
};
