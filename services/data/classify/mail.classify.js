import pool from "../../../config/db.js";
import openai from "../../../config/openai.js";
import { logAIAnomaly } from "./index.js";

export const safeParseBatchMail = (outputText, mailIds) => {
    try {
        let text = outputText?.trim();

        if (!text) {
            logAIAnomaly("EMPTY_OUTPUT", {
                mailCount: mailIds.length,
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
                error: err.message,
                outputPreview: text.slice(0, 300),
                mailCount: mailIds.length,
            });
            throw err;
        }

        if (!Array.isArray(parsed) && Array.isArray(parsed.results)) {
            parsed = parsed.results;
        }

        if (!Array.isArray(parsed)) {
            logAIAnomaly("INVALID_FORMAT", {
                parsedType: typeof parsed,
                outputPreview: text.slice(0, 300),
            });
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
                continue; // bozuk item'ı sessizce geç
            }

            resultMap.set(item.mail_id, {
                mail_id: item.mail_id,
                category: item.category,
                confidence: item.confidence,
            });
        }

        const missingIds = mailIds.filter((id) => !resultMap.has(id));
        if (missingIds.length > 0) {
            logAIAnomaly("PARTIAL_RESULT", {
                total: mailIds.length,
                missingCount: missingIds.length,
                missingIds,
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
        logAIAnomaly("FALLBACK_TRIGGERED", {
            reason: err.message,
            mailCount: mailIds.length,
        });

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

export const createMailCategories = async (mails) => {
    const batchSize = 10;

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
