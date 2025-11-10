// netlify/functions/get-logs.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

exports.handler = async function (event, context) {
  // 1) make sure env vars are there
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: "Supabase env vars missing in Netlify.",
      }),
    };
  }

  // 2) build Supabase REST url for your table
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
        statusCode: resp.status,
        body: JSON.stringify({
          ok: false,
          message: "Supabase fetch failed",
          detail: text,
        }),
      };
    }

    const rows = await resp.json();

    // 4) send back to the browser
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        logs: rows,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: err.message,
      }),
    };
  }
};
