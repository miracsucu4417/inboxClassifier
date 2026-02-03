import express from "express";
import { checkJWT, getUserInfo } from "../middlewares/auth.middleware.js";
import { dataRefreshMailController, dataRefreshEventController } from "../controllers/data.controller.js";

const dataRouter = express.Router();

dataRouter.post("/refresh/mail", checkJWT, getUserInfo, dataRefreshMailController);

dataRouter.post("/refresh/event", checkJWT, getUserInfo, dataRefreshEventController);

export default dataRouter;
