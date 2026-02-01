import express from "express";
import { googleController, googleCallbackController } from "../controllers/auth.controller.js";
import { checkJWT, getUserInfo } from "../middlewares/auth.middleware.js";

const authRouter = express.Router();

authRouter.get("/google", googleController);

authRouter.get("/google/callback", googleCallbackController);

authRouter.get("/me", checkJWT, getUserInfo, (req, res) => {
    const user = req.user;

    res.status(200).json({ user });
});

authRouter.post("/logout", (req, res) => {
    res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.JWT_COOKIE_HTTPS_ONLY,
        sameSite: "lax",
        path: "/",
    });

    res.status(200).json({ message: "Logged out" });
});

export default authRouter;
