export * from "./mail.classify.js";
export * from "./event.classify.js";

export const logAIAnomaly = (type, payload) => {
    console.warn("[AI_ANOMALY]", {
        type,
        timestamp: new Date().toISOString(),
        ...payload,
    });
};
