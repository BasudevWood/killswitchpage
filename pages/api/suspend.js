// pages/api/suspend.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });


  try {
    const results = { render: [], vercel: null };

    // 1) Suspend Render service(s)
    // You can set RENDER_SERVICE_IDS as comma separated list
    const renderApiKey = process.env.RENDER_API_KEY;
    const serviceIds = (process.env.RENDER_SERVICE_IDS || "").split(",").map(s => s.trim()).filter(Boolean);

    for (const id of serviceIds) {
      const r = await fetch(`https://api.render.com/v1/services/${id}/suspend`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${renderApiKey}`,
          "Accept": "application/json"
        }
      });
      const body = await safeParse(r);
      results.render.push({ serviceId: id, status: r.status, ok: r.ok, body });
    }

    // 2) Pause Vercel project
    const vercelProjectId = process.env.FURNITURE_PROJECT_ID;
    const vercelToken = process.env.VERCEL_TOKEN;
    let vercelUrl = `https://api.vercel.com/v1/projects/${vercelProjectId}/pause`;
    if (process.env.VERCEL_TEAM_ID) vercelUrl += `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`;

    const v = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vercelToken}`,
        "Content-Type": "application/json"
      }
    });

    results.vercel = { status: v.status, ok: v.ok, body: await safeParse(v) };

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error("suspend error:", err);
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