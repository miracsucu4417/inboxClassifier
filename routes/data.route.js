import express from "express";
import { checkJWT, getUserInfo } from "../middlewares/auth.middleware.js";
import { dataSyncMailController, dataSyncEventsController } from "../controllers/data.controller.js";

const dataRouter = express.Router();

// /data/sync/*
// /data/classify/*
// /data/stats/*

dataRouter.post("/sync/mail", checkJWT, getUserInfo, dataSyncMailController);

dataRouter.post("/sync/event", checkJWT, getUserInfo, dataSyncEventsController);

export default dataRouter;
