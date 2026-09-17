const API_BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export const getVault = () => request("/api/vault");
export const saveVault = (encrypted_data) => request("/api/vault", {
  method: "PUT",
  body: JSON.stringify({ encrypted_data }),
});
export const deleteVault = () => request("/api/vault", { method: "DELETE" });
