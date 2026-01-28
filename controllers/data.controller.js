import { getNewMails, saveMailsDatabase, getNewEvents, saveEventsDatabase } from "../services/data.service.js";
import { getOAuthRefreshToken } from "../services/auth.service.js";

export const dataSyncMailController = async (req, res) => {
    try {
        const user = req.user;
        const refresh_token = await getOAuthRefreshToken("google", user.id);
        const messages = await getNewMails(refresh_token, user.id);

        const syncedCount = await saveMailsDatabase(messages, user.id);

        res.status(200).json({ status: "ok", synced: syncedCount, skipped: messages.length - syncedCount });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

export const dataSyncEventsController = async (req, res) => {
    try {
        const user = req.user;
        const refresh_token = await getOAuthRefreshToken("google", user.id);
        const events = await getNewEvents(refresh_token, user.id);

        const syncedCount = await saveEventsDatabase(events, user.id);

        res.status(200).json({ status: "ok", synced: syncedCount, skipped: events.length - syncedCount });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
