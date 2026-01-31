import pool from "../../../config/db.js";
import openai from "../../../config/openai.js";
import { logAIAnomaly } from "./index.js";

export const safeParseBatchEvent = (outputText, eventIds) => {
    try {
        let text = outputText?.trim();

        if (!text) {
            logAIAnomaly("EMPTY_OUTPUT", {
                entity: "event",
                count: eventIds.length,
            });
            throw new Error("Empty AI output");
        }

        if (text.startsWith("```")) {
            text = text.replace(/^```(?:json)?\s*/i, "");
            text = text.replace(/```$/, "");
            text = text.trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            logAIAnomaly("JSON_PARSE_FAILED", {
                entity: "event",
                error: err.message,
                outputPreview: text.slice(0, 300),
                count: eventIds.length,
            });
            throw err;
        }

        if (!Array.isArray(parsed) && Array.isArray(parsed.results)) {
            parsed = parsed.results;
        }

        if (!Array.isArray(parsed)) {
            logAIAnomaly("INVALID_FORMAT", {
                entity: "event",
                parsedType: typeof parsed,
                outputPreview: text.slice(0, 300),
            });
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
                continue; // bozuk item sessizce geçilir
            }

            resultMap.set(item.event_id, {
                event_id: item.event_id,
                category: item.category,
                confidence: item.confidence,
            });
        }

        const missingIds = eventIds.filter((id) => !resultMap.has(id));
        if (missingIds.length > 0) {
            logAIAnomaly("PARTIAL_RESULT", {
                entity: "event",
                total: eventIds.length,
                missingCount: missingIds.length,
                missingIds,
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
        logAIAnomaly("FALLBACK_TRIGGERED", {
            entity: "event",
            reason: err.message,
            count: eventIds.length,
        });

        return eventIds.map((id) => ({
            event_id: id,
            category: "other",
            confidence: 0,
        }));
    }
};

export const getUncategorizedEvents = async (user_id) => {
    const result = await pool.query(
        "SELECT id, title, description, location, start_time, end_time, all_day FROM events WHERE user_id = $1 AND category IS NULL",
        [user_id],
    );

    return result.rows;
};

export const createEventCategories = async (events) => {
    const batchSize = 10;

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
