import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError, SignupSchema, LoginSchema } from "@seatsnap/shared";
import { pool } from "../db.js";
import { config } from "../config.js";

export const authRouter = Router();

authRouter.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = SignupSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      const existing = await pool.query(
        "SELECT id FROM auth.users WHERE email = $1",
        [normalizedEmail]
      );

      if (existing.rows.length > 0) {
        throw new AppError(409, "CONFLICT", "A user with this email already exists");
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO auth.users (email, password_hash, role)
         VALUES ($1, $2, 'customer')
         RETURNING id, email, role, created_at`,
        [normalizedEmail, passwordHash]
      );

      const user = result.rows[0];

      const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        config.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = LoginSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      const result = await pool.query(
        "SELECT id, email, password_hash, role FROM auth.users WHERE email = $1",
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const token = jwt.sign(
        { userId: user.id, role: user.role, email: user.email },
        config.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
