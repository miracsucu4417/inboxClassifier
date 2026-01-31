import pool from "../../../config/db.js";

export const getMailCategories = async (userId) => {
    try {
        const result = await pool.query(
            "SELECT category, COUNT(*) as count FROM mails WHERE user_id = $1 AND category IS NOT NULL GROUP BY category",
            [userId],
        );

        const categories = result.rows.map((row) => ({
            category: row.category,
            count: Number(row.count),
        }));

        return categories;
    } catch (error) {
        throw error;
    }
};

export const getEventCategories = async (userId) => {
    try {
        const result = await pool.query(
            "SELECT category, COUNT(*) as count FROM events WHERE user_id = $1 AND category IS NOT NULL GROUP BY category",
            [userId],
        );

        const categories = result.rows.map((row) => ({
            category: row.category,
            count: Number(row.count),
        }));

        return categories;
    } catch (error) {
        throw error;
    }
};
