const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// Configuration
// --------------------------------------------------

app.use(express.json({ limit: "2mb" }));

const DATA_DIR = process.env.DATA_DIR || "./data";
const VAULT_FILE = path.join(DATA_DIR, "vault.json");

// Create data directory
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --------------------------------------------------
// Simple API key protection
// --------------------------------------------------
// Put a long random value in Render environment variables:
// API_KEY=your-long-random-secret
//
// The frontend/extension sends:
// Authorization: Bearer YOUR_API_KEY
// --------------------------------------------------

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("WARNING: API_KEY is not configured.");
}

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
// Health check
// --------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Private Tab Vault"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

// --------------------------------------------------
// Get encrypted vault
// --------------------------------------------------

app.get("/api/vault", authenticate, (req, res) => {
    try {
        if (!fs.existsSync(VAULT_FILE)) {
            return res.json({
                exists: false,
                vault: null
            });
        }

        const data = JSON.parse(
            fs.readFileSync(VAULT_FILE, "utf8")
        );

        res.json({
            exists: true,
            vault: data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Could not read vault"
        });
    }
});

// --------------------------------------------------
// Save encrypted vault
// --------------------------------------------------

app.put("/api/vault", authenticate, (req, res) => {
    try {
        const vault = req.body;

        if (!vault || typeof vault !== "object") {
            return res.status(400).json({
                error: "Invalid vault"
            });
        }

        // Basic size protection
        const serialized = JSON.stringify(vault);

        if (Buffer.byteLength(serialized, "utf8") > 2 * 1024 * 1024) {
            return res.status(413).json({
                error: "Vault is too large"
            });
        }

        // Atomic-ish write:
        // write temporary file first, then replace old file.
        const tempFile = `${VAULT_FILE}.tmp`;

        fs.writeFileSync(
            tempFile,
            serialized,
            {
                encoding: "utf8",
                mode: 0o600
            }
        );

        fs.renameSync(tempFile, VAULT_FILE);

        res.json({
            success: true,
            savedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Could not save vault"
        });
    }
});

// --------------------------------------------------
// Delete vault
// --------------------------------------------------

app.delete("/api/vault", authenticate, (req, res) => {
    try {
        if (fs.existsSync(VAULT_FILE)) {
            fs.unlinkSync(VAULT_FILE);
        }

        res.json({
            success: true
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Could not delete vault"
        });
    }
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Private Tab Vault running on port ${PORT}`);
});
