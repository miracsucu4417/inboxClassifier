import { getOAuthRefreshToken } from "../../../services/auth.service.js";
import { getNewMails } from "../sync/mail.sync.js";
import { updateMailsDatabase } from "../sync/mail.sync.js";
import { getUncategorizedMails, createMailCategories, updateMailCategories } from "../classify/index.js";

export const syncMailData = async (user) => {
    const refresh_token = await getOAuthRefreshToken("google", user.id);
    const messages = await getNewMails(refresh_token, user.id);

    const { inserted, deleted } = await updateMailsDatabase(messages, user.id);

    return {
        inserted,
        skipped: messages.length - inserted,
        deleted,
    };
};

export const classifyMailData = async (user) => {
    const mails = await getUncategorizedMails(user.id);
    const categories = await createMailCategories(mails);
    const updatedCount = await updateMailCategories(categories, user.id);

    return { updatedCount };
};
