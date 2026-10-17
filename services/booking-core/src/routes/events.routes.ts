import { Router, Request, Response, NextFunction } from "express";
import { AppError, EventsQuerySchema } from "@seatsnap/shared";
import { pool } from "../db.js";

export const eventsRouter = Router();

eventsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = EventsQuerySchema.parse(req.query);

      let sql = `
        SELECT
          e.id,
          e.title,
          e.category,
          e.city,
          e.description,
          COALESCE(
            json_agg(
              json_build_object(
                'id', s.id,
                'event_id', s.event_id,
                'venue_name', s.venue_name,
                'starts_at', s.starts_at
              ) ORDER BY s.starts_at ASC
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS shows
        FROM booking.events e
        LEFT JOIN booking.shows s ON e.id = s.event_id
      `;

      const conditions: string[] = [];
      const values: unknown[] = [];

      if (query.city) {
        values.push(query.city);
        conditions.push(`LOWER(e.city) = LOWER($${values.length})`);
      }

      if (query.category) {
        values.push(query.category);
        conditions.push(`LOWER(e.category) = LOWER($${values.length})`);
      }

      if (query.q) {
        values.push(`%${query.q}%`);
        conditions.push(`(e.title ILIKE $${values.length} OR e.description ILIKE $${values.length})`);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
      }

      sql += ` GROUP BY e.id, e.title, e.category, e.city, e.description ORDER BY e.title ASC`;

      const result = await pool.query(sql, values);
      res.status(200).json(result.rows);
    } catch (err) {
      next(err);
    }
  }
);

eventsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const sql = `
        SELECT
          e.id,
          e.title,
          e.category,
          e.city,
          e.description,
          COALESCE(
            json_agg(
              json_build_object(
                'id', s.id,
                'event_id', s.event_id,
                'venue_name', s.venue_name,
                'starts_at', s.starts_at
              ) ORDER BY s.starts_at ASC
            ) FILTER (WHERE s.id IS NOT NULL),
            '[]'
          ) AS shows
        FROM booking.events e
        LEFT JOIN booking.shows s ON e.id = s.event_id
        WHERE e.id = $1
        GROUP BY e.id, e.title, e.category, e.city, e.description
      `;

      const result = await pool.query(sql, [id]);

      if (result.rows.length === 0) {
        throw new AppError(404, "NOT_FOUND", "Event not found");
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      next(err);
    }
  }
);
