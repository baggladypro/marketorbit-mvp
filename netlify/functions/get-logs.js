// netlify/functions/get-logs.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

exports.handler = async function () {
  // 1) make sure env vars are there
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Supabase env vars missing in Netlify.",
        got: {
          SUPABASE_URL: !!SUPABASE_URL,
          SUPABASE_SERVICE_ROLE: !!SUPABASE_SERVICE_ROLE,
        },
      }),
    };
  }

  // 2) hit Supabase REST for your table
  // your table is public.activity_logs and it does NOT have created_at,
  // so we'll order by id (uuid) instead of created_at.
  const url = `${SUPABASE_URL}/rest/v1/activity_logs?select=*&order=id.desc&limit=50`;

  try {
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: "return=representation",
      },
    });

    // read as text first so we can debug weird responses
    const text = await resp.text();

    if (!resp.ok) {
      // Supabase returned an error
      return {
        statusCode: resp.status,
        body: JSON.stringify({
          ok: false,
          error: "Supabase returned an error",
          status: resp.status,
          supabase: text,
        }),
      };
    }

    // try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: "Supabase did not return JSON",
          supabase: text,
        }),
      };
    }

    // success
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        logs: data || [],
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err.message,
      }),
    };
  }
};
