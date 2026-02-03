import { Pool } from "pg";

let pool;

if (process.env.DATABASE_URL) {
    // 👉 PROD (Render, Supabase, Neon, vs.)
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false, // Render için gerekli
        },
    });
} else {
    // 👉 LOCAL (WSL / local postgres)
    pool = new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: Number(process.env.DB_PORT),
    });
}

export default pool;
