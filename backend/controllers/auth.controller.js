import oauth2Client from "../config/google.js";
import { getGoogleUserInfo, getUserByEmail, createUser, generateJWT, updateOAuthRefreshToken } from "../services/auth.service.js";

export const googleController = (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/gmail.readonly",
        ],
    });

    res.redirect(authUrl);
};

export const googleCallbackController = async (req, res) => {
    try {
        const code = req.query?.code;

        const { userInfo, refreshToken } = await getGoogleUserInfo(code);

        let user = await getUserByEmail(userInfo.email);

        if (!user) {
            if (!refreshToken) {
                return res.status(400).json({
                    message: "Google refresh token is required. Please re-consent.",
                });
            }

            user = await createUser(userInfo, "google", refreshToken);
        } else {
            if (refreshToken) {
                await updateOAuthRefreshToken(user.id, "google", refreshToken);
            }
        }

        const jwtToken = generateJWT(user.id);

        res.cookie("auth_token", jwtToken, {
            httpOnly: true,
            secure: process.env.JWT_COOKIE_HTTPS_ONLY,
            sameSite: process.env.JWT_COOKIE_SAME_SITE,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        res.redirect(process.env.FRONTEND_URL);
    } catch (error) {
        console.error(error);

        if (error == "No code provided") {
            res.redirect(process.env.FRONTEND_URL);
        } else {
            res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
        }
    }
};
