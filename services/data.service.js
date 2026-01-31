import { google } from "googleapis";
import oauth2Client from "../config/google.js";
import pool from "../config/db.js";
import openai from "../config/openai.js";
import { config } from "dotenv";

config();

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

export const getLastEventDate = async (user_id) => {
    const result = await pool.query("SELECT MAX(start_time) FROM events WHERE user_id = $1", [user_id]);

    const lastEventDate = result.rows[0].max;
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let timeMin;

    if (!lastEventDate) {
        timeMin = oneMonthAgo;
    } else {
        const lastEvent = new Date(lastEventDate);

        const bufferedDate = new Date(lastEvent);
        bufferedDate.setDate(bufferedDate.getDate() - 2);

        timeMin = bufferedDate < oneMonthAgo ? oneMonthAgo : bufferedDate;
    }

    return timeMin;
};

export const getNewEvents = async (refresh_token, user_id) => {
    const timeMin = await getLastEventDate(user_id);

    oauth2Client.setCredentials({ refresh_token });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    let pageToken;
    const events_data = [];

    do {
        const res = await calendar.events.list({
            calendarId: "primary",
            timeMin: timeMin.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 250,
            pageToken,
        });

        const events = res.data.items ?? [];

        for (const event of events) {
            if (event.status === "cancelled") continue;

            const isAllDay = !!event.start?.date;

            const startTime = isAllDay ? event.start?.date : event.start?.dateTime;

            const endTime = isAllDay ? event.end?.date : event.end?.dateTime;

            events_data.push({
                id: event.id,
                title: event.summary,
                description: event.description,
                location: event.location,
                startTime,
                endTime,
                all_day: isAllDay,
            });
        }

        pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events_data;
};

export const updateEventsDatabase = async (events, user_id) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1️⃣ Son 1 ay içindeki event'leri ekle
        if (events.length > 0) {
            const values = [];
            const placeholders = [];

            let index = 1;

            for (const event of events) {
                placeholders.push(
                    `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`,
                );

                values.push(
                    user_id,
                    event.id, // event_id (Google)
                    event.title ?? null,
                    event.description ?? null,
                    event.location ?? null,
                    event.startTime ? new Date(event.startTime) : null,
                    event.endTime ? new Date(event.endTime) : null,
                    event.all_day ?? false,
                );
            }

            const insertQuery = `
                INSERT INTO events (
                    user_id,
                    event_id,
                    title,
                    description,
                    location,
                    start_time,
                    end_time,
                    all_day
                )
                VALUES ${placeholders.join(",")}
                ON CONFLICT (user_id, event_id)
                DO NOTHING
            `;

            await client.query(insertQuery, values);
        }

        // 2️⃣ 1 aydan eski event'leri sil
        const deleteQuery = `
            DELETE FROM events
            WHERE user_id = $1
              AND (
                start_time IS NULL
                OR start_time < NOW() - INTERVAL '1 month'
              )
        `;

        const deleteResult = await client.query(deleteQuery, [user_id]);

        await client.query("COMMIT");

        return {
            inserted: events.length,
            deleted: deleteResult.rowCount,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const safeParseBatchMail = (outputText, mailIds) => {
    try {
        let text = outputText.trim();

        // ```json ... ``` veya ``` ... ``` temizle
        if (text.startsWith("```")) {
            text = text.replace(/^```(?:json)?\s*/i, "");
            text = text.replace(/```$/, "");
            text = text.trim();
        }

        let parsed = JSON.parse(text);

        // Eğer { results: [...] } geldiyse
        if (!Array.isArray(parsed) && Array.isArray(parsed.results)) {
            parsed = parsed.results;
        }

        if (!Array.isArray(parsed)) {
            throw new Error("AI response is not an array");
        }

        const resultMap = new Map();

        for (const item of parsed) {
            if (
                typeof item !== "object" ||
                typeof item.mail_id !== "number" ||
                typeof item.category !== "string" ||
                typeof item.confidence !== "number"
            ) {
                continue;
            }

            resultMap.set(item.mail_id, {
                mail_id: item.mail_id,
                category: item.category,
                confidence: item.confidence,
            });
        }

        return mailIds.map(
            (id) =>
                resultMap.get(id) || {
                    mail_id: id,
                    category: "other",
                    confidence: 0,
                },
        );
    } catch (err) {
        return mailIds.map((id) => ({
            mail_id: id,
            category: "other",
            confidence: 0,
        }));
    }
};

export const getUncategorizedMails = async (user_id) => {
    const result = await pool.query(
        "SELECT id, subject, sender, snippet, received_at FROM mails WHERE user_id = $1 AND category IS NULL",
        [user_id],
    );

    return result.rows;
};

export const getMailCategories = async (mails) => {
    const batchSize = 10;
    const categories = [];

    const categoryList = [
        "work",
        "personal",
        "finance",
        "shopping",
        "education",
        "social",
        "promotion",
        "health",
        "travel",
        "deadline",
        "spam",
        "other",
    ];

    const categoryText = categoryList.map((cat) => `- ${cat}`).join("\n");

    const prompts = [];

    for (let i = 0; i * batchSize < mails.length; i++) {
        const batch = mails.slice(i * batchSize, (i + 1) * batchSize);
        const mailIds = batch.map((mail) => mail.id);

        const mailText = JSON.stringify(batch);

        const prompt = `
You are an email classification system.
You do NOT chat.
You do NOT explain.
You do NOT justify.
You ONLY return valid JSON.

Choose ONE category from the list below:
${categoryText}

Rules:
- Use ONLY the categories above
- Confidence must be a number between 0 and 1
- If none apply, use "other"
- Return ONLY JSON
- Email count: ${batch.length}

IMPORTANT:
- Do NOT use markdown
- Do NOT wrap the JSON in \`\`\`json
- Output MUST be raw JSON

Email data:
${mailText}

Return this exact JSON format:
[
  {
    "mail_id": number,
    "category": string,
    "confidence": number
  }
]
`;

        prompts.push({ prompt, mailIds });
    }

    const results = await Promise.all(
        prompts.map(async ({ prompt, mailIds }) => {
            const response = await openai.responses.create({
                model: process.env.LLM_MODEL,
                temperature: 0,
                input: prompt,
            });
            return safeParseBatchMail(response.output_text, mailIds);
        }),
    );

    return results.flat();
};

export const updateMailCategories = async (categories, user_id) => {
    if (!categories || categories.length === 0) return 0;

    const values = [];
    const placeholders = [];

    categories.forEach((cat, index) => {
        const baseIndex = index * 3;
        placeholders.push(`($${baseIndex + 1}::int, $${baseIndex + 2}::text, $${baseIndex + 3}::real)`);
        values.push(cat.mail_id, cat.category, cat.confidence);
    });

    const query = `
    UPDATE mails AS m
    SET
      category = v.category,
      category_confidence = v.confidence
    FROM (
      VALUES ${placeholders.join(",")}
    ) AS v(id, category, confidence)
    WHERE m.id = v.id
      AND m.user_id = $${values.length + 1}
  `;

    values.push(user_id);

    const result = await pool.query(query, values);
    return result.rowCount;
};

export const safeParseBatchEvent = (outputText, eventIds) => {
    try {
        let text = outputText.trim();

        // ```json ... ``` veya ``` ... ``` temizle
        if (text.startsWith("```")) {
            text = text.replace(/^```(?:json)?\s*/i, "");
            text = text.replace(/```$/, "");
            text = text.trim();
        }

        let parsed = JSON.parse(text);

        // Eğer { results: [...] } geldiyse
        if (!Array.isArray(parsed) && Array.isArray(parsed.results)) {
            parsed = parsed.results;
        }

        if (!Array.isArray(parsed)) {
            throw new Error("AI response is not an array");
        }

        const resultMap = new Map();

        for (const item of parsed) {
            if (
                typeof item !== "object" ||
                typeof item.event_id !== "number" ||
                typeof item.category !== "string" ||
                typeof item.confidence !== "number"
            ) {
                continue;
            }

            resultMap.set(item.event_id, {
                event_id: item.event_id,
                category: item.category,
                confidence: item.confidence,
            });
        }

        return eventIds.map(
            (id) =>
                resultMap.get(id) || {
                    event_id: id,
                    category: "other",
                    confidence: 0,
                },
        );
    } catch (err) {
        return eventIds.map((id) => ({
            event_id: id,
            category: "other",
            confidence: 0,
        }));
    }
};

export const getUncategorizedEvents = async (user_id) => {
    const result = await pool.query(
        `
        SELECT 
            id,
            title,
            description,
            location,
            start_time,
            end_time,
            all_day
        FROM events
        WHERE user_id = $1
          AND category IS NULL
        `,
        [user_id],
    );

    return result.rows;
};

export const getEventCategories = async (events) => {
    const batchSize = 10;
    const categories = [];

    const categoryList = [
        "work",
        "meeting",
        "personal",
        "health",
        "education",
        "travel",
        "finance",
        "deadline",
        "social",
        "reminder",
        "other",
    ];

    const categoryText = categoryList.map((cat) => `- ${cat}`).join("\n");

    const prompts = [];

    for (let i = 0; i * batchSize < events.length; i++) {
        const batch = events.slice(i * batchSize, (i + 1) * batchSize);
        const eventIds = batch.map((event) => event.id);

        const eventText = JSON.stringify(batch);

        const prompt = `
You are an event classification system.
You do NOT chat.
You do NOT explain.
You do NOT justify.
You ONLY return valid JSON.

Choose ONE category from the list below:
${categoryText}

Rules:
- Use ONLY the categories above
- Confidence must be a number between 0 and 1
- If none apply, use "other"
- Return ONLY JSON
- Event count: ${batch.length}

IMPORTANT:
- Do NOT use markdown
- Do NOT wrap the JSON in \`\`\`json
- Output MUST be raw JSON

Event data:
${eventText}

Return this exact JSON format:
[
  {
    "event_id": number,
    "category": string,
    "confidence": number
  }
]
`;

        prompts.push({ prompt, eventIds });
    }

    const results = await Promise.all(
        prompts.map(async ({ prompt, eventIds }) => {
            const response = await openai.responses.create({
                model: process.env.LLM_MODEL,
                temperature: 0,
                input: prompt,
            });

            return safeParseBatchEvent(response.output_text, eventIds);
        }),
    );

    return results.flat();
};

export const updateEventCategories = async (categories, user_id) => {
    if (!categories || categories.length === 0) return 0;

    const values = [];
    const placeholders = [];

    categories.forEach((cat, index) => {
        const baseIndex = index * 3;
        placeholders.push(`($${baseIndex + 1}::int, $${baseIndex + 2}::text, $${baseIndex + 3}::real)`);
        values.push(cat.event_id, cat.category, cat.confidence);
    });

    const query = `
        UPDATE events AS e
        SET
            category = v.category,
            category_confidence = v.confidence
        FROM (
            VALUES ${placeholders.join(",")}
        ) AS v(id, category, confidence)
        WHERE e.id = v.id
          AND e.user_id = $${values.length + 1}
    `;

    values.push(user_id);

    const result = await pool.query(query, values);
    return result.rowCount;
};
