import { getOAuthRefreshToken } from "../../../services/auth.service.js";
import { getNewEvents } from "../sync/event.sync.js";
import { updateEventsDatabase } from "../sync/event.sync.js";
import { getUncategorizedEvents, createEventCategories, updateEventCategories } from "../classify/index.js";

export const syncEventData = async (user) => {
    const refresh_token = await getOAuthRefreshToken("google", user.id);
    const events = await getNewEvents(refresh_token, user.id);

    const { inserted, deleted } = await updateEventsDatabase(events, user.id);

    return {
        inserted,
        skipped: events.length - inserted,
        deleted,
    };
};
export const classifyEventData = async (user) => {
    const events = await getUncategorizedEvents(user.id);
    const categories = await createEventCategories(events);
    const updatedCount = await updateEventCategories(categories, user.id);

    return { updatedCount };
};
