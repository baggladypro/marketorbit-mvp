// netlify/functions/get-logs.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

exports.handler = async (event, context) => {
  // 1) make sure env vars exist
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        message: "Supabase env vars missing in Netlify.",
      }),
    };
  }

  // 2) build Supabase REST URL
  const url = `${SUPABASE_URL}/rest/v1/activity_logs?select=*&order=created_at.desc&limit=50`;

  try {
    // 3) call Supabase
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: "return=representation",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          message: "Supabase responded with an error.",
          supabase: text,
        }),
      };
    }

    const rows = await resp.json();

    // 👈 this is the important part: return `logs`
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        logs: rows, // <--
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        message: "Exception calling Supabase.",
        error: String(err),
      }),
    };
  }
};
