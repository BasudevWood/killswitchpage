// pages/index.js
import { useState } from "react";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

const callApi = async (path) => {
  setBusy(true);
  setMsg("Working...");

  try {
    const res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    const json = await res.json();
    setMsg(JSON.stringify(json, null, 2));
  } catch (err) {
    setMsg("Error: " + err.message);
  } finally {
    setBusy(false);
  }
};


  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 30 }}>
      <h1>Killswitch Admin</h1>
      <p>Controls furniture-app backend (Render) and frontend (Vercel).</p>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => callApi("suspend")}
          disabled={busy}
          style={{ padding: "10px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 6 }}
        >
          Suspend Service
        </button>

        <button
          onClick={() => callApi("restart")}
          disabled={busy}
          style={{ padding: "10px 16px", background: "#10b981", color: "white", border: "none", borderRadius: 6 }}
        >
          Restart Service
        </button>
      </div>

      <pre style={{ background: "#f3f4f6", padding: 12, marginTop: 20, whiteSpace: "pre-wrap" }}>{msg}</pre>
    </div>
  );
}
