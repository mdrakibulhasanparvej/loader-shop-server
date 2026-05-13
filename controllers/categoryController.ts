import { Request, Response } from "express";
import Category from "../models/Category";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { body, validationResult } from "express-validator";

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().lean();
    res.json(
      ApiResponse.success(categories, "Categories fetched successfully"),
    );
  } catch (error) {
    logger.error(error.message);
    res.status(500).json(ApiResponse.error("Error fetching categories"));
  }
};

export const createCategory = [
  body("name").trim().notEmpty().withMessage("Category name is required"),
  body("subCategories")
    .optional()
    .isArray()
    .withMessage("SubCategories must be an array"),
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

      const { name, subCategories } = req.body;
      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json(ApiResponse.error("Category name is required"));
      }

      const normalizedSubCategories = Array.isArray(subCategories)
        ? subCategories
            .filter((item: any) => typeof item === "string")
            .map((item: string) => item.trim())
            .filter(Boolean)
        : typeof subCategories === "string"
          ? subCategories
              .split(",")
              .map((item: string) => item.trim())
              .filter(Boolean)
          : [];

      const existing = await Category.findOne({ name: name.trim() });
      if (existing) {
        if (normalizedSubCategories.length === 0) {
          return res
            .status(409)
            .json(ApiResponse.error("Category already exists"));
        }

        const uniqueSubCategories = Array.from(
          new Set([...existing.subCategories, ...normalizedSubCategories]),
        );
        existing.subCategories = uniqueSubCategories;
        await existing.save();
        return res
          .status(200)
          .json(ApiResponse.success(existing, "Category updated"));
      }

      const category = new Category({
        name: name.trim(),
        subCategories: normalizedSubCategories,
      });

      await category.save();
      res.status(201).json(ApiResponse.success(category, "Category created"));
    } catch (error) {
      logger.error(error.message);
      res.status(500).json(ApiResponse.error("Error creating category"));
    }
  },
];

// Extra (not in BE-3 task):
// export const deleteCategory = async (req: Request, res: Response) => {
//   try {
//     const category = await Category.findByIdAndDelete(req.params.id);
//     if (!category) return res.status(404).json(ApiResponse.error("Category not found"));
//     res.json(ApiResponse.success(null, "Category deleted successfully"));
//   } catch (error) {
//     logger.error(error.message);
//     res.status(500).json(ApiResponse.error("Error deleting category"));
//   }
// };
