import express from "express";
import indexRouter from "./routes/index.js";
import cors from "cors";

const app = express();

app.use(
    cors({
        origin: "http://localhost:4000",
        credentials: true,
    }),
);

app.use(express.json());

app.use("/api", indexRouter);

export default app;
