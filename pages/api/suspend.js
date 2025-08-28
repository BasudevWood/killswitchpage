// pages/api/suspend.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const backendUrl = process.env.FURNITURE_BACKEND_URL; // e.g. https://your-backend.onrender.com

    // 1) Tell FurnitureApp clients to redirect away NOW
    if (backendUrl) {
      try {
        await fetch(`${backendUrl}/status/redirect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: "https://www.basudevwood.com/" })
        });
      } catch (e) {
        console.error("Failed to broadcast redirect:", e.message);
      }
    }

    // Respond immediately to the Admin UI
    res.status(200).json({ ok: true, message: "Broadcasted redirect. Suspending services in 5s..." });

    // 2) After a short delay, suspend backend + frontend
    setTimeout(async () => {
      const results = { render: [], vercel: null, backend: null };
      try {
        // Suspend Render services
        const renderApiKey = process.env.RENDER_API_KEY;
        const serviceIds = (process.env.RENDER_SERVICE_IDS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

     for (const id of serviceIds) {
  try {
    const r = await fetch(`https://api.render.com/v1/services/${id}/suspend`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${renderApiKey}`,
        Accept: "application/json",
      },
    });
    const body = await safeParse(r);
    console.log("🔎 Render suspend response:", { id, status: r.status, body });
    results.render.push({ serviceId: id, status: r.status, ok: r.ok, body });
  } catch (err) {
    console.error(`❌ Error suspending Render service ${id}:`, err.message);
  }
}

        // Pause Vercel project
        const vercelProjectId = process.env.FURNITURE_PROJECT_ID;
        const vercelToken = process.env.VERCEL_TOKEN;
        let vercelUrl = `https://api.vercel.com/v1/projects/${vercelProjectId}/pause`;
        if (process.env.VERCEL_TEAM_ID) vercelUrl += `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`;

        const v = await fetch(vercelUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            "Content-Type": "application/json",
          },
        });
        results.vercel = { status: v.status, ok: v.ok, body: await safeParse(v) };

        // (Optional) Also mark backend as suspended (bookkeeping)
        if (backendUrl) {
          const b = await fetch(`${backendUrl}/status/suspend`, { method: "POST" });
          results.backend = { status: b.status, ok: b.ok, body: await safeParse(b) };
        }

        console.log("✅ Services suspended after client redirect:", results);
      } catch (err) {
        console.error("❌ suspend error:", err.message);
      }
    }, 5000); // wait 5s to give clients time to leave
  } catch (err) {
    console.error("suspend error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function safeParse(resp) {
  try {
    const text = await resp.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch {
    return null;
  }
}
