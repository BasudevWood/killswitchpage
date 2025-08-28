// pages/api/restart.js
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const results = { vercel: null, render: [], backend: null };

    // 1) Resume Render service(s) first so backend endpoints are reachable
    const renderApiKey = process.env.RENDER_API_KEY;
    const serviceIds = (process.env.RENDER_SERVICE_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const id of serviceIds) {
      const r = await fetch(`https://api.render.com/v1/services/${id}/resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${renderApiKey}`,
          Accept: "application/json",
        },
      });
      const body = await safeParse(r);
      results.render.push({ serviceId: id, status: r.status, ok: r.ok, body });
    }

    // 2) Clear redirect + suspended flags in backend
    const backendUrl = process.env.FURNITURE_BACKEND_URL;
    if (backendUrl) {
      try {
        const c1 = await fetch(`${backendUrl}/status/clear-redirect`, { method: "POST" });
        const c2 = await fetch(`${backendUrl}/status/resume`, { method: "POST" });
        results.backend = {
          clearRedirect: { status: c1.status, ok: c1.ok, body: await safeParse(c1) },
          resume:        { status: c2.status, ok: c2.ok, body: await safeParse(c2) },
        };
      } catch (err) {
        results.backend = { error: err.message };
      }
    }

    // 3) Unpause Vercel project (bring frontend back)
    const vercelProjectId = process.env.FURNITURE_PROJECT_ID;
    const vercelToken = process.env.VERCEL_TOKEN;
    let vercelUrl = `https://api.vercel.com/v1/projects/${vercelProjectId}/unpause`;
    if (process.env.VERCEL_TEAM_ID)
      vercelUrl += `?teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`;

    const v = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vercelToken}`,
        "Content-Type": "application/json",
      },
    });
    results.vercel = { status: v.status, ok: v.ok, body: await safeParse(v) };

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error("restart error:", err);
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
