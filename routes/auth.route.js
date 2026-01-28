import express from "express";
import { googleController, googleCallbackController } from "../controllers/auth.controller.js";
import { checkJWT, getUserInfo } from "../middlewares/auth.middleware.js";

/*
auth/refresh
auth/logout
auth/me
*/

const authRouter = express.Router();

authRouter.get("/google", googleController);

authRouter.get("/google/callback", googleCallbackController);

authRouter.get("/me", checkJWT, getUserInfo, (req, res) => {
    const user = req.user;

    res.status(200).json({ user})
})

export default authRouter;
