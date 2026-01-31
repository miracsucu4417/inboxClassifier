import pool from "../../../config/db.js";
import { google } from "googleapis";
import oauth2Client from "../../../config/google.js";

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
