const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// Configuration
// --------------------------------------------------

app.use(express.json({ limit: "2mb" }));

const API_KEY = process.env.API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;

// --------------------------------------------------
// Startup configuration check
// --------------------------------------------------

console.log("Starting Tab-Pri backend...");

if (!API_KEY) {
    console.warn("WARNING: API_KEY is not configured.");
}

if (!CLOUDFLARE_API_TOKEN) {
    console.warn("WARNING: CLOUDFLARE_API_TOKEN is not configured.");
}

if (!CLOUDFLARE_ACCOUNT_ID) {
    console.warn("WARNING: CLOUDFLARE_ACCOUNT_ID is not configured.");
}

if (!D1_DATABASE_ID) {
    console.warn("WARNING: D1_DATABASE_ID is not configured.");
}

// --------------------------------------------------
// Authentication
// --------------------------------------------------

function authenticate(req, res, next) {
    if (!API_KEY) {
        return res.status(500).json({
            error: "Server API_KEY is not configured"
        });
    }

    const auth = req.headers.authorization || "";

    if (auth !== `Bearer ${API_KEY}`) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    next();
}

// --------------------------------------------------
// D1 helper
// --------------------------------------------------

async function d1Query(sql, params = []) {
    if (!CLOUDFLARE_API_TOKEN) {
        throw new Error("CLOUDFLARE_API_TOKEN is not configured");
    }

    if (!CLOUDFLARE_ACCOUNT_ID) {
        throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured");
    }

    if (!D1_DATABASE_ID) {
        throw new Error("D1_DATABASE_ID is not configured");
    }

    const url =
        `https://api.cloudflare.com/client/v4/accounts/` +
        `${CLOUDFLARE_ACCOUNT_ID}/d1/database/` +
        `${D1_DATABASE_ID}/query`;

    const response = await fetch(url, {
        method: "POST",

        headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            sql,
            params
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        console.error("Cloudflare D1 error:", data);

        throw new Error(
            data.errors?.[0]?.message ||
            "Cloudflare D1 request failed"
        );
    }

    return data;
}

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Private Tab Vault",
        database: "Cloudflare D1"
    });
});

app.get("/health", async (req, res) => {
    try {
        await d1Query("SELECT 1");

        res.json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            status: "error",
            database: "disconnected"
        });
    }
});

// --------------------------------------------------
// GET VAULT
// --------------------------------------------------

app.get("/api/vault", authenticate, async (req, res) => {
    try {
        const result = await d1Query(
            "SELECT id, encrypted_data, updated_at FROM vault WHERE id = 1"
        );

        const rows = result.result?.[0]?.results || [];

        if (rows.length === 0) {
            return res.json({
                exists: false,
                vault: null
            });
        }

        res.json({
            exists: true,
            vault: {
                id: rows[0].id,
                encrypted_data: rows[0].encrypted_data,
                updated_at: rows[0].updated_at
            }
        });

    } catch (error) {
        console.error("GET vault error:", error);

        res.status(500).json({
            error: "Could not read vault"
        });
    }
});

// --------------------------------------------------
// SAVE VAULT
// --------------------------------------------------

app.put("/api/vault", authenticate, async (req, res) => {
    try {
        const vault = req.body;

        if (!vault || typeof vault !== "object") {
            return res.status(400).json({
                error: "Invalid vault"
            });
        }

        if (
            typeof vault.encrypted_data !== "string" ||
            vault.encrypted_data.length === 0
        ) {
            return res.status(400).json({
                error: "encrypted_data is required"
            });
        }

        // 2 MB maximum
        if (Buffer.byteLength(
            vault.encrypted_data,
            "utf8"
        ) > 2 * 1024 * 1024) {
            return res.status(413).json({
                error: "Vault is too large"
            });
        }

        const updatedAt = new Date().toISOString();

        await d1Query(
            `
            INSERT INTO vault (
                id,
                encrypted_data,
                updated_at
            )
            VALUES (1, ?, ?)

            ON CONFLICT(id)
            DO UPDATE SET
                encrypted_data = excluded.encrypted_data,
                updated_at = excluded.updated_at
            `,
            [
                vault.encrypted_data,
                updatedAt
            ]
        );

        res.json({
            success: true,
            savedAt: updatedAt
        });

    } catch (error) {
        console.error("SAVE vault error:", error);

        res.status(500).json({
            error: "Could not save vault"
        });
    }
});

// --------------------------------------------------
// DELETE VAULT
// --------------------------------------------------

app.delete("/api/vault", authenticate, async (req, res) => {
    try {
        await d1Query(
            "DELETE FROM vault WHERE id = 1"
        );

        res.json({
            success: true
        });

    } catch (error) {
        console.error("DELETE vault error:", error);

        res.status(500).json({
            error: "Could not delete vault"
        });
    }
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `Private Tab Vault running on port ${PORT}`
    );
});
