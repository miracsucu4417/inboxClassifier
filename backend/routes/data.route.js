import express from "express";
import { checkJWT, getUserInfo } from "../middlewares/auth.middleware.js";
import {
    dataSyncMailController,
    dataSyncEventsController,
    dataClassifyMailController,
    dataClassifyEventController,
} from "../controllers/data.controller.js";
import { getMailCategories, getEventCategories } from "../services/data/stats/index.js";
import { statsHandler } from "../controllers/data.controller.js";
import { dataRefreshMailController, dataRefreshEventController } from "../controllers/data.controller.js";

const dataRouter = express.Router();

dataRouter.post("/sync/mail", checkJWT, getUserInfo, dataSyncMailController);

dataRouter.post("/sync/event", checkJWT, getUserInfo, dataSyncEventsController);

dataRouter.post("/classify/mail", checkJWT, getUserInfo, dataClassifyMailController);

dataRouter.post("/classify/event", checkJWT, getUserInfo, dataClassifyEventController);

dataRouter.get("/stats/mail", checkJWT, getUserInfo, statsHandler(getMailCategories));

dataRouter.get("/stats/event", checkJWT, getUserInfo, statsHandler(getEventCategories));

dataRouter.post("/refresh/mail", checkJWT, getUserInfo, dataRefreshMailController);

dataRouter.post("/refresh/event", checkJWT, getUserInfo, dataRefreshEventController);

export default dataRouter;
