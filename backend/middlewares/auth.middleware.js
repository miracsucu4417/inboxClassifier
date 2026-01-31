import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const checkJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized" });
    }
};

export const getUserInfo = async (req, res, next) => {
    try {
        const userId = req.userId;

        const result = await pool.query("SELECT id, full_name, email, picture_url, created_at FROM users WHERE id = $1", [userId]);

        if (result.rowCount === 0) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
