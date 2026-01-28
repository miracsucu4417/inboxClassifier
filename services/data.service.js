import { google } from "googleapis";
import oauth2Client from "../config/google.js";
import pool from "../config/db.js";

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

export const saveMailsDatabase = async (messages, user_id) => {
    if (messages.length === 0) return;

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

    const query = `
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
    RETURNING id;
  `;

    const result = await pool.query(query, values);

    return result.rowCount;
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

export const saveEventsDatabase = async (events, user_id) => {
    if (events.length === 0) return;

    const values = [];
    const placeholders = [];

    let index = 1;

    for (const event of events) {
        placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`);

        values.push(
            user_id,
            event.id, // event_id
            event.title ?? null,
            event.description ?? null,
            event.location ?? null,
            event.startTime ? new Date(event.startTime) : null,
            event.endTime ? new Date(event.endTime) : null,
            event.all_day ?? false,
        );
    }

    const query = `
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
    RETURNING id;
  `;

    const result = await pool.query(query, values);

    return result.rowCount;
};
