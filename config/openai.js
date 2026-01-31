import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.LLM_SECRET_KEY,
});

export default openai;