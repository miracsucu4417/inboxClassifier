import oauth2Client from "../config/google.js";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { google } from "googleapis";

export const getGoogleUserInfo = async (code) => {
    try {
        if (!code) {
            throw new Error("No code provided");
        }

        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        const decoded = jwt.decode(tokens.id_token);

        if (!decoded?.email) {
            const error = new Error("Email not provided by Google");
            error.statusCode = 400;
            throw error;
        }

        const userInfo = {
            email: decoded.email,
            fullName: decoded.name ?? null,
            pictureURL: decoded.picture ?? null,
        };

        const refreshToken = tokens?.refresh_token;

        return { userInfo, refreshToken };
    } catch (error) {
        throw error;
    }
};

async function getUserBy(field, value) {
    const allowedFields = ["id", "email"];

    if (!allowedFields.includes(field)) {
        throw new Error("Invalid field");
    }

    const query = `
    SELECT id, email, full_name, picture_url
    FROM users
    WHERE ${field} = $1
    LIMIT 1
  `;

    const { rows } = await pool.query(query, [value]);
    return rows[0] || null;
}

export const getUserById = (id) => getUserBy("id", id);

export const getUserByEmail = (email) => getUserBy("email", email);

export const createUser = async (userInfo, provider, refreshToken) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { rows } = await client.query(
            `
      INSERT INTO users (email, full_name, picture_url)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, picture_url
      `,
            [userInfo.email, userInfo.fullName, userInfo.pictureURL],
        );

        const user = rows[0];

        const encryptedToken = encrypt(refreshToken);

        await client.query(
            `
      INSERT INTO oauth_tokens (user_id, provider, encrypted_token)
      VALUES ($1, $2, $3)
      `,
            [user.id, provider, encryptedToken],
        );

        await client.query("COMMIT");

        return user;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

export const updateOAuthRefreshToken = async (userId, provider, refreshToken) => {
    const encryptedToken = encrypt(refreshToken);

    await pool.query(
        `
    UPDATE oauth_tokens
    SET encrypted_token = $1
    WHERE user_id = $2 AND provider = $3
  `,
        [encryptedToken, userId, provider],
    );
};

export const generateJWT = (userId) => {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

export const getOAuthRefreshToken = async (provider, user_id) => {
    const result = await pool.query("SELECT encrypted_token FROM oauth_tokens WHERE user_id = $1 AND provider = $2", [
        user_id,
        provider,
    ]);

    if (result.rowCount === 0) {
        throw new Error("No refresh token found");
    }

    const refresh_token = decrypt(result.rows[0].encrypted_token);

    return refresh_token;
};
