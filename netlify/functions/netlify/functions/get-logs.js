// netlify/functions/get-logs.js

export default async function handler(req, res) {
  // Netlify functions can be ESM like this (same as your other one)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({
      ok: false,
      message: "Supabase env vars missing in Netlify.",
    });
  }

  // Supabase REST endpoint for table "activity_logs"
  // We sort newest first and limit to 50
  const url = `${SUPABASE_URL}/rest/v1/activity_logs?select=*&order=created_at.desc&limit=50`;

  try {
    const fb = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: "return=representation",
      },
    });

    if (!fb.ok) {
      const text = await fb.text();
      return res.status(500).json({
        ok: false,
        message: "Supabase returned an error",
        supabase: text,
      });
    }

    const data = await fb.json();

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: "Fetch to Supabase failed",
      error: String(err),
    });
  }
}
