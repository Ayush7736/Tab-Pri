const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// Environment variables
// --------------------------------------------------

const API_KEY = process.env.API_KEY;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const D1_DATABASE_ID = process.env.D1_DATABASE_ID;

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
    express.json({
        limit: "2mb"
    })
);

// --------------------------------------------------
// Startup checks
// --------------------------------------------------

console.log("Starting Tab-Pri backend...");

const requiredVariables = [
    "API_KEY",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_ACCOUNT_ID",
    "D1_DATABASE_ID"
];

for (const variable of requiredVariables) {
    if (!process.env[variable]) {
        console.warn(
            `WARNING: ${variable} is not configured.`
        );
    }
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

    const authorization =
        req.headers.authorization || "";

    const expected =
        `Bearer ${API_KEY}`;

    if (authorization !== expected) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    next();
}

// --------------------------------------------------
// Cloudflare D1 API
// --------------------------------------------------

async function d1Query(sql, params = []) {
    if (!CLOUDFLARE_API_TOKEN) {
        throw new Error(
            "CLOUDFLARE_API_TOKEN is not configured"
        );
    }

    if (!CLOUDFLARE_ACCOUNT_ID) {
        throw new Error(
            "CLOUDFLARE_ACCOUNT_ID is not configured"
        );
    }

    if (!D1_DATABASE_ID) {
        throw new Error(
            "D1_DATABASE_ID is not configured"
        );
    }

    const url =
        `https://api.cloudflare.com/client/v4/` +
        `accounts/${CLOUDFLARE_ACCOUNT_ID}/` +
        `d1/database/${D1_DATABASE_ID}/query`;

    const response = await fetch(url, {
        method: "POST",

        headers: {
            "Authorization":
                `Bearer ${CLOUDFLARE_API_TOKEN}`,

            "Content-Type":
                "application/json"
        },

        body: JSON.stringify({
            sql,
            params
        })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        console.error(
            "Cloudflare D1 error:",
            data
        );

        throw new Error(
            data.errors?.[0]?.message ||
            "Cloudflare D1 request failed"
        );
    }

    return data;
}

// --------------------------------------------------
// Basic routes
// --------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Tab-Pri",
        version: "1.0.0"
    });
});

// --------------------------------------------------
// Health check
// --------------------------------------------------

app.get("/health", async (req, res) => {
    try {
        await d1Query("SELECT 1");

        res.json({
            status: "ok",
            database: "connected",
            timestamp:
                new Date().toISOString()
        });

    } catch (error) {
        console.error(
            "Health check error:",
            error
        );

        res.status(500).json({
            status: "error",
            database: "disconnected"
        });
    }
});

// --------------------------------------------------
// GET ENCRYPTED VAULT
// --------------------------------------------------

app.get(
    "/api/vault",
    authenticate,
    async (req, res) => {
        try {
            const result = await d1Query(
                `
                SELECT
                    id,
                    encrypted_data,
                    updated_at
                FROM vault
                WHERE id = 1
                `
            );

            const rows =
                result.result?.[0]?.results || [];

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
                    encrypted_data:
                        rows[0].encrypted_data,
                    updated_at:
                        rows[0].updated_at
                }
            });

        } catch (error) {
            console.error(
                "GET /api/vault error:",
                error
            );

            res.status(500).json({
                error: "Could not read vault"
            });
        }
    }
);

// --------------------------------------------------
// CREATE / UPDATE ENCRYPTED VAULT
// --------------------------------------------------

app.put(
    "/api/vault",
    authenticate,
    async (req, res) => {
        try {
            const {
                encrypted_data
            } = req.body;

            if (
                typeof encrypted_data !==
                "string"
            ) {
                return res.status(400).json({
                    error:
                        "encrypted_data must be a string"
                });
            }

            if (
                encrypted_data.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "encrypted_data cannot be empty"
                });
            }

            // Maximum encrypted vault size:
            // 2 MB
            const size =
                Buffer.byteLength(
                    encrypted_data,
                    "utf8"
                );

            if (size > 2 * 1024 * 1024) {
                return res.status(413).json({
                    error:
                        "Vault exceeds 2 MB limit"
                });
            }

            const updatedAt =
                new Date().toISOString();

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
                    encrypted_data =
                        excluded.encrypted_data,

                    updated_at =
                        excluded.updated_at
                `,
                [
                    encrypted_data,
                    updatedAt
                ]
            );

            res.json({
                success: true,
                savedAt: updatedAt
            });

        } catch (error) {
            console.error(
                "PUT /api/vault error:",
                error
            );

            res.status(500).json({
                error: "Could not save vault"
            });
        }
    }
);

// --------------------------------------------------
// DELETE ENTIRE VAULT
// --------------------------------------------------

app.delete(
    "/api/vault",
    authenticate,
    async (req, res) => {
        try {
            await d1Query(
                "DELETE FROM vault WHERE id = 1"
            );

            res.json({
                success: true,
                message: "Vault deleted"
            });

        } catch (error) {
            console.error(
                "DELETE /api/vault error:",
                error
            );

            res.status(500).json({
                error: "Could not delete vault"
            });
        }
    }
);

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((req, res) => {
    res.status(404).json({
        error: "Endpoint not found"
    });
});

// --------------------------------------------------
// Error handler
// --------------------------------------------------

app.use((error, req, res, next) => {
    console.error(
        "Unhandled server error:",
        error
    );

    res.status(500).json({
        error: "Internal server error"
    });
});

// --------------------------------------------------
// Start
// --------------------------------------------------

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Private Tab Vault running on port ${PORT}`
        );
    }
);
