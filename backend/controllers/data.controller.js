import { syncMailData, classifyMailData, syncEventData, classifyEventData } from "../services/data/refresh/index.js";
import { getMailCategories } from "../services/data/stats/index.js";
import { getEventCategories } from "../services/data/stats/index.js";

export const dataRefreshMailController = async (req, res) => {
    try {
        const user = req.user;

        // 1️⃣ sync
        await syncMailData(user);

        // 2️⃣ classify
        await classifyMailData(user);

        // 3️⃣ stats
        const categories = await getMailCategories(user.id);
        const categoriesSafe = Array.isArray(categories) ? categories : [];
        const total = categoriesSafe.reduce((sum, item) => sum + item.count, 0);

        res.status(200).json({
            status: "ok",
            total,
            categoryCount: categories.length,
            categories,
        });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({
            message: error.message || "Internal server error",
        });
    }
};

export const dataRefreshEventController = async (req, res) => {
    try {
        const user = req.user;

        // 1️⃣ sync
        await syncEventData(user);

        // 2️⃣ classify
        await classifyEventData(user);

        // 3️⃣ stats
        const categories = await getEventCategories(user.id);
        const categoriesSafe = Array.isArray(categories) ? categories : [];
        const total = categoriesSafe.reduce((sum, item) => sum + item.count, 0);

        res.status(200).json({
            status: "ok",
            total,
            categoryCount: categories.length,
            categories,
        });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({
            message: error.message || "Internal server error",
        });
    }
};
