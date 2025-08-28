// pages/api/restart.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = req.headers["x-kill-secret"];
  if (!secret || secret !== process.env.KILLSWITCH_SECRET) return res.status(401).json({ error: "Unauthorized" });

  try {
    const results = { vercel: null, render: [] };

    // 1) Unpause Vercel project
    const vercelProjectId = process.env.FURNITURE_PROJECT_ID;
    const vercelToken = process.env.VERCEL_TOKEN;
    let vercelUrl = `https://api.vercel.com/v1/projects/${vercelProjectId}/unpause`;
    if (process.env.VERCEL_TEAM_ID) vercelUrl += `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`;

    const v = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vercelToken}`,
        "Content-Type": "application/json"
      }
    });
    results.vercel = { status: v.status, ok: v.ok, body: await safeParse(v) };

    // 2) Resume Render service(s)
    const renderApiKey = process.env.RENDER_API_KEY;
    const serviceIds = (process.env.RENDER_SERVICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

    for (const id of serviceIds) {
      // If the service was suspended, resume; otherwise you might want to restart
      const r = await fetch(`https://api.render.com/v1/services/${id}/resume`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${renderApiKey}`,
          "Accept": "application/json"
        }
      });
      const body = await safeParse(r);
      results.render.push({ serviceId: id, status: r.status, ok: r.ok, body });
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error("restart error:", err);
    res.status(500).json({ error: err.message });
  }
}

async function safeParse(resp) {
  try {
    const text = await resp.text();  // read once
    try {
      return JSON.parse(text);       // try parsing JSON
    } catch {
      return text;                   // fallback to raw text
    }
  } catch (e) {
    return null;
  }
}