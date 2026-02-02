import { getOAuthRefreshToken } from "../services/auth.service.js";
import { getNewMails, updateMailsDatabase, getNewEvents, updateEventsDatabase } from "../services/data/sync/index.js";
import {
    getUncategorizedMails,
    createMailCategories,
    updateMailCategories,
    getUncategorizedEvents,
    createEventCategories,
    updateEventCategories,
} from "../services/data/classify/index.js";
import { syncMailData, classifyMailData, syncEventData, classifyEventData } from "../services/data/refresh/index.js";
import { getMailCategories } from "../services/data/stats/index.js";
import { getEventCategories } from "../services/data/stats/index.js";

export const dataSyncMailController = async (req, res) => {
    try {
        const user = req.user;
        const refresh_token = await getOAuthRefreshToken("google", user.id);
        const messages = await getNewMails(refresh_token, user.id);

        const { inserted, deleted } = await updateMailsDatabase(messages, user.id);

        res.status(200).json({ status: "ok", synced: inserted, skipped: messages.length - inserted, deleted });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({ error: error.message || "Internal server error" });
    }
};

export const dataSyncEventsController = async (req, res) => {
    try {
        const user = req.user;
        const refresh_token = await getOAuthRefreshToken("google", user.id);
        const events = await getNewEvents(refresh_token, user.id);

        const { inserted, deleted } = await updateEventsDatabase(events, user.id);

        res.status(200).json({ status: "ok", synced: inserted, skipped: events.length - inserted, deleted });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({ error: error.message || "Internal server error" });
    }
};

export const dataClassifyMailController = async (req, res) => {
    try {
        const user = req.user;
        const mails = await getUncategorizedMails(user.id);
        const categories = await createMailCategories(mails);
        const updatedCount = await updateMailCategories(categories, user.id);

        res.status(200).json({
            success: "ok",
            updated_count: updatedCount,
        });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({
            message: error.message || "Internal Server Error",
        });
    }
};

export const dataClassifyEventController = async (req, res) => {
    try {
        const user = req.user;
        const events = await getUncategorizedEvents(user.id);
        const categories = await createEventCategories(events);
        const updatedCount = await updateEventCategories(categories, user.id);

        res.status(200).json({
            success: "ok",
            updated_count: updatedCount,
        });
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({
            message: error.message || "Internal Server Error",
        });
    }
};

export const statsHandler = (getCategoriesFn) => {
    return async (req, res) => {
        try {
            const user = req.user;
            const categories = await getCategoriesFn(user.id);
            const totalCount = categories.reduce((sum, item) => sum + item.count, 0);

            res.status(200).json({
                status: "ok",
                total: totalCount,
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
};

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
        res.status(500).json({
            message: error.message || "Refresh mail failed",
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
        res.status(500).json({
            message: error.message || "Refresh event failed",
        });
    }
};
