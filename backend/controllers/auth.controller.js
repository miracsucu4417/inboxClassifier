import oauth2Client from "../config/google.js";
import { getGoogleUserInfo, getUserByEmail, createUser, generateJWT } from "../services/auth.service.js";

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
        }

        const jwtToken = generateJWT(user.id);

        res.json({
            message: "OAuth successful",
            jwtToken,
        });
    } catch (error) {
        console.error(error);
        res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
    }
};
