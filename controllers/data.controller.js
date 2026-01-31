import {
    getNewMails,
    updateMailsDatabase,
    getNewEvents,
    updateEventsDatabase,
    getUncategorizedMails,
    updateMailCategories,
    getMailCategories,
    getUncategorizedEvents,
    updateEventCategories,
    getEventCategories,
} from "../services/data.service.js";
import { getOAuthRefreshToken } from "../services/auth.service.js";

export const dataSyncMailController = async (req, res) => {
    try {
        const user = req.user;
        const refresh_token = await getOAuthRefreshToken("google", user.id);
        const messages = await getNewMails(refresh_token, user.id);

        const { inserted, deleted } = await updateMailsDatabase(messages, user.id);

        res.status(200).json({ status: "ok", synced: inserted, skipped: messages.length - inserted, deleted });
    } catch (error) {
        console.log(error);
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
        console.log(error);
        res.status(error.status || 500).json({ error: error.message || "Internal server error" });
    }
};

export const dataClassifyMailController = async (req, res) => {
    try {
        const user = req.user;
        const mails = await getUncategorizedMails(user.id);
        const categories = await getMailCategories(mails);
        const updatedCount = await updateMailCategories(categories, user.id);

        res.status(200).json({
            success: "ok",
            updated_count: updatedCount,
        });
    } catch (error) {
        console.log(error);
        res.status(error.status || 500).json({
            message: error.message || "Internal Server Error",
        });
    }
};

export const dataClassifyEventController = async (req, res) => {
    try {
        const user = req.user;
        const events = await getUncategorizedEvents(user.id);
        const categories = await getEventCategories(events);
        const updatedCount = await updateEventCategories(categories, user.id);

        console.log(categories);

        res.status(200).json({
            success: "ok",
            updated_count: updatedCount,
        });
    } catch (error) {
        console.log(error);
        res.status(error.status || 500).json({
            message: error.message || "Internal Server Error",
        });
    }
};
