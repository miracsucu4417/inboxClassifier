import express from "express";
import indexRouter from "./routes/index.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    }),
);

app.use(cookieParser());

app.use(express.json());

app.use("/api", indexRouter);

export default app;
