export default async function handler(req, res) {
  console.log("========== KILL SWITCH TRIGGERED ==========");

  if (req.method !== "POST") {
    console.log("[KillSwitch] Invalid method:", req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const renderApiKey = process.env.RENDER_API_KEY;
    const serviceIds = (process.env.RENDER_SERVICE_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log("[KillSwitch] Using Render API key:", !!renderApiKey);
    console.log("[KillSwitch] Service IDs:", serviceIds);

    for (const id of serviceIds) {
      console.log(`[KillSwitch] Suspending Render service: ${id}`);
      const renderRes = await fetch(`https://api.render.com/v1/services/${id}/suspend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${renderApiKey}` },
      });

      const txt = await renderRes.text();
      console.log(`[KillSwitch] Render response for ${id}:`, renderRes.status, txt);
    }

    // 🔹 Suspend Vercel project
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.FURNITURE_PROJECT_ID;

    console.log("[KillSwitch] Suspending Vercel project:", vercelProjectId);

    const vercelRes = await fetch(
      `https://api.vercel.com/v1/projects/${vercelProjectId}/pause`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${vercelToken}` },
      }
    );

    const vercelTxt = await vercelRes.text();
    console.log("[KillSwitch] Vercel response:", vercelRes.status, vercelTxt);

    // 🔹 Call backend to set suspended flag
    const backendUrl = process.env.FURNITURE_BACKEND_URL;
    console.log("[KillSwitch] Calling backend:", backendUrl);

    const backendRes = await fetch(`${backendUrl}/status/redirect`, { method: "POST" });
    const backendTxt = await backendRes.text();
    console.log("[KillSwitch] Backend /status/redirect response:", backendRes.status, backendTxt);

    return res.status(200).json({ message: "Suspension triggered" });
  } catch (error) {
    console.error("[KillSwitch] Error:", error);
    return res.status(500).json({ message: "Error triggering suspension", error: error.message });
  }
}
