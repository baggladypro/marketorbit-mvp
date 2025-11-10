// netlify/functions/get-logs.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

exports.handler = async function () {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: "Supabase env vars missing in Netlify.",
        got: {
          SUPABASE_URL: SUPABASE_URL || null,
          SUPABASE_SERVICE_ROLE: !!SUPABASE_SERVICE_ROLE,
        },
      }),
    };
  }

  // this is the exact endpoint we're going to hit
  const url = `${SUPABASE_URL}/rest/v1/activity_logs?select=*&order=id.desc&limit=50`;

  try {
    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: "return=representation",
      },
    });

    const text = await resp.text();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({
          ok: false,
          step: "supabase-fetch",
          status: resp.status,
          url,
          supabase: text,
        }),
      };
    }

    let data = [];
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          step: "json-parse",
          url,
          raw: text,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        url,
        count: Array.isArray(data) ? data.length : 0,
        logs: Array.isArray(data) ? data : [],
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        step: "netlify-catch",
        error: err.message,
      }),
    };
  }
};
