const RENDER_ORIGIN = (process.env.RENDER_ORIGIN || "https://tab-pri.onrender.com").replace(/\/$/, "");

export default async function handler(req, res) {
  if (!["GET", "PUT", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RENDER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Server vault configuration is missing" });

  const headers = { Authorization: `Bearer ${apiKey}` };
  if (req.method === "PUT") headers["Content-Type"] = "application/json";

  try {
    const upstream = await fetch(`${RENDER_ORIGIN}/api/vault`, {
      method: req.method,
      headers,
      body: req.method === "PUT" ? JSON.stringify(req.body || {}) : undefined,
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (error) {
    console.error("Vault proxy error:", error);
    res.status(502).json({ error: "Vault backend unavailable" });
  }
}
