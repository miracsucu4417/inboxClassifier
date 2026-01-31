import express from "express";
import authRouter from "./auth.route.js";
import dataRouter from "./data.route.js";

const indexRouter = express.Router();

indexRouter.use("/auth", authRouter);

indexRouter.use("/data", dataRouter);

indexRouter.get("/ping", (req, res) => {
    res.json({ message: "Backend çalışıyor" });
});

export default indexRouter;
