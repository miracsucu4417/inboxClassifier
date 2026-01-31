import pool from "../../../config/db.js";
import { google } from "googleapis";
import oauth2Client from "../../../config/google.js";

export const getLastEmailDate = async (user_id) => {
    const result = await pool.query("SELECT MAX(received_at) FROM mails WHERE user_id = $1", [user_id]);

    const lastEmailDate = result.rows[0].max;

    return lastEmailDate;
};

export const getMailIds = async (refresh_token, user_id) => {
    const MAX_TOTAL = 300;
    const lastEmailDate = await getLastEmailDate(user_id);

    let messages = [];
    let pageToken;
    let q = "is:inbox";

    if (lastEmailDate && new Date() - new Date(lastEmailDate).getTime() < 1000 * 60 * 60 * 24 * 7) {
        const after = Math.floor(new Date(lastEmailDate).getTime() / 1000);
        q += ` after:${after}`;
    } else {
        q += " newer_than:7d";
    }

    oauth2Client.setCredentials({ refresh_token });

    const gmail = google.gmail({
        version: "v1",
        auth: oauth2Client,
    });

    while (true) {
        const res = await gmail.users.messages.list({
            userId: "me",
            maxResults: 100,
            q,
            pageToken,
        });

        messages.push(...(res.data.messages ?? []));

        if (!res.data.nextPageToken || messages.length >= MAX_TOTAL) {
            break;
        }

        pageToken = res.data.nextPageToken;
    }

    return messages;
};

export const getNewMails = async (refresh_token, user_id) => {
    const messageIds = await getMailIds(refresh_token, user_id);
    const messages = [];

    oauth2Client.setCredentials({ refresh_token });

    const gmail = google.gmail({
        version: "v1",
        auth: oauth2Client,
    });

    const BATCH_SIZE = 10;

    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);

        const results = await Promise.all(
            batch.map(async (msg) => {
                const res = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id,
                    format: "full",
                });

                const message = res.data;
                const headers = message.payload?.headers || [];

                const from = headers.find((h) => h.name === "From")?.value;
                const subject = headers.find((h) => h.name === "Subject")?.value;
                const date = headers.find((h) => h.name === "Date")?.value;

                return {
                    id: msg.id,
                    threadId: msg.threadId,
                    from,
                    subject,
                    date,
                    snippet: message.snippet,
                };
            }),
        );

        messages.push(...results);
    }

    return messages;
};

export const updateMailsDatabase = async (messages, user_id) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1️⃣ Son 7 gün içindeki mailleri ekle
        if (messages.length > 0) {
            const values = [];
            const placeholders = [];

            let index = 1;

            for (const mail of messages) {
                placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`);

                values.push(
                    user_id,
                    mail.id, // message_id
                    mail.threadId, // thread_id
                    mail.from ?? null, // sender
                    mail.subject ?? null,
                    mail.snippet ?? null,
                    mail.date ? new Date(mail.date) : null,
                );
            }

            const insertQuery = `
                INSERT INTO mails (
                    user_id,
                    message_id,
                    thread_id,
                    sender,
                    subject,
                    snippet,
                    received_at
                )
                VALUES ${placeholders.join(",")}
                ON CONFLICT (user_id, message_id)
                DO NOTHING
            `;

            await client.query(insertQuery, values);
        }

        // 2️⃣ 7 günden eski mailleri sil
        const deleteQuery = `
            DELETE FROM mails
            WHERE user_id = $1
              AND received_at < NOW() - INTERVAL '7 days'
        `;

        const deleteResult = await client.query(deleteQuery, [user_id]);

        await client.query("COMMIT");

        return {
            inserted: messages.length,
            deleted: deleteResult.rowCount,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
