// pages/api/suspend.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    // ✅ Step 1: Tell frontend where to redirect first
    res.status(200).json({ redirect: "https://www.basudevwood.com/" });

    // ✅ Step 2: Wait a bit before killing services
    setTimeout(async () => {
      const results = { render: [], vercel: null, backend: null };

      try {
        // Suspend Render service(s)
        const renderApiKey = process.env.RENDER_API_KEY;
        const serviceIds = (process.env.RENDER_SERVICE_IDS || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        for (const id of serviceIds) {
          const r = await fetch(`https://api.render.com/v1/services/${id}/suspend`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${renderApiKey}`,
              Accept: "application/json",
            },
          });
          const body = await safeParse(r);
          results.render.push({ serviceId: id, status: r.status, ok: r.ok, body });
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

        // Tell Furniture backend to set suspended = true
        const backendUrl = process.env.FURNITURE_BACKEND_URL;
        if (backendUrl) {
          const b = await fetch(`${backendUrl}/status/suspend`, { method: "POST" });
          results.backend = { status: b.status, ok: b.ok, body: await safeParse(b) };
        }

        console.log("✅ Services suspended after redirect:", results);
      } catch (err) {
        console.error("❌ suspend error:", err.message);
      }
    }, 5000); // wait 5s before suspending
  } catch (err) {
    console.error("suspend error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function safeParse(resp) {
  try {
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (e) {
    return null;
  }
}
