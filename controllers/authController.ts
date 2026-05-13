import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { AuthRequest } from "../middleware/verifyAuth";

const JWT_SECRET = process.env.JWT_SECRET || "loader_shop_jwt_secret_2026";

const generateToken = (user: any) => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const sanitizeUser = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  profileImage: user.profileImage,
  createdAt: user.createdAt,
});

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json(ApiResponse.error("Name, email, and password are required."));
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json(ApiResponse.error("Password must be at least 6 characters."));
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json(ApiResponse.error("A user with this email already exists."));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: "customer",
      status: "active",
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    logger.error("Register error:", error.message);
    res
      .status(500)
      .json(ApiResponse.error("Server error during registration."));
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json(ApiResponse.error("Email and password are required."));
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json(ApiResponse.error("Invalid email or password."));
    }

    if (!user.password) {
      return res.status(401).json(
        ApiResponse.error(
          "This account uses a different sign-in method. Please try Google login.",
        ),
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json(ApiResponse.error("Invalid email or password."));
    }

    if (user.status === "blocked") {
      return res
        .status(403)
        .json(
          ApiResponse.error(
            "Your account has been suspended. Please contact support.",
          ),
        );
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful.",
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    logger.error("Login error:", error.message);
    res
      .status(500)
      .json(ApiResponse.error("Server error during login."));
  }
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select("-password -__v");
    if (!user)
      return res.status(404).json(ApiResponse.error("User not found."));
    res.json(
      ApiResponse.success(sanitizeUser(user), "Profile fetched successfully."),
    );
  } catch (error: any) {
    logger.error("Get profile error:", error.message);
    res.status(500).json(ApiResponse.error("Server error"));
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, profileImage } = req.body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (profileImage !== undefined) updateData.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: updateData },
      { new: true },
    ).select("-password");
    if (!user)
      return res.status(404).json(ApiResponse.error("User not found."));
    res.json(ApiResponse.success(sanitizeUser(user), "Profile updated successfully."));
  } catch (error: any) {
    logger.error("Update profile error:", error.message);
    res.status(500).json(ApiResponse.error("Server error"));
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (req.query.status) filter.status = req.query.status;
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .select("-password -__v");
    const total = await User.countDocuments(filter);

    res.json(
      ApiResponse.successWithPagination(
        users,
        {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
        "Users fetched successfully.",
      ),
    );
  } catch (error: any) {
    logger.error("Get users error:", error.message);
    res.status(500).json(ApiResponse.error("Server error"));
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (id === req.user!._id) {
      return res
        .status(400)
        .json(ApiResponse.error("You cannot change your own status."));
    }
    if (!["active", "blocked"].includes(status)) {
      return res
        .status(400)
        .json(ApiResponse.error("Status must be 'active' or 'blocked'."));
    }

    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user)
      return res.status(404).json(ApiResponse.error("User not found."));
    res.json(
      ApiResponse.success(
        sanitizeUser(user),
        `User ${status === "blocked" ? "blocked" : "unblocked"} successfully.`,
      ),
    );
  } catch (error: any) {
    logger.error("Update user status error:", error.message);
    res.status(500).json(ApiResponse.error("Server error"));
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (id === req.user!._id) {
      return res
        .status(400)
        .json(ApiResponse.error("You cannot change your own role."));
    }
    if (!["customer", "seller", "admin"].includes(role)) {
      return res
        .status(400)
        .json(
          ApiResponse.error("Role must be 'customer', 'seller', or 'admin'."),
        );
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user)
      return res.status(404).json(ApiResponse.error("User not found."));
    res.json(ApiResponse.success(sanitizeUser(user), "User role updated successfully."));
  } catch (error: any) {
    logger.error("Update user role error:", error.message);
    res.status(500).json(ApiResponse.error("Server error"));
  }
};
