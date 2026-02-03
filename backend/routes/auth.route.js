import express from "express";
import { googleController, googleCallbackController } from "../controllers/auth.controller.js";
import { checkJWT, getUserInfo } from "../middlewares/auth.middleware.js";
import { deleteUser } from "../services/auth.service.js";

const authRouter = express.Router();

authRouter.get("/google", googleController);

authRouter.get("/google/callback", googleCallbackController);

authRouter.get("/me", checkJWT, getUserInfo, (req, res) => {
    const user = req.user;

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    res.status(200).json({ user });
});

authRouter.post("/logout", (req, res) => {
    res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.JWT_COOKIE_HTTPS_ONLY,
        sameSite: process.env.JWT_COOKIE_SAME_SITE,
        path: "/",
    });

    res.status(200).json({ message: "Logged out" });
});

authRouter.delete("/delete-account", checkJWT, getUserInfo, async (req, res) => {
    try {
        await deleteUser(req.user.id);

        res.clearCookie("auth_token", {
            httpOnly: true,
            secure: process.env.JWT_COOKIE_HTTPS_ONLY,
            sameSite: process.env.JWT_COOKIE_SAME_SITE,
            path: "/",
        });

        res.status(204).json();
    } catch (error) {
        console.log(error);
        res.status(error.status || 500).json({ message: error.message || "Internal server error" });
    }
});

export default authRouter;
