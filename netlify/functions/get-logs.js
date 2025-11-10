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
      }),
    };
  }

  const base = `${SUPABASE_URL}/rest/v1/activity_logs`;

  try {
    // 1) write a test row through the SAME API we're reading from
    const insertRes = await fetch(base, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        action: "netlify_probe",
        topic: "api wrote this",
        caption: "if you see this, API is writing to a DB",
      }),
    });

    const insertText = await insertRes.text();

    // 2) now read back
    const selectUrl = `${base}?select=*&order=id.desc&limit=50`;
    const selectRes = await fetch(selectUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        Prefer: "return=representation",
      },
    });
    const selectText = await selectRes.text();

    let rows = [];
    try {
      rows = JSON.parse(selectText);
      if (!Array.isArray(rows)) rows = [];
    } catch (e) {
      rows = [];
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          ok: true,
          wrote: {
            status: insertRes.status,
            raw: insertText,
          },
          read: {
            status: selectRes.status,
            url: selectUrl,
            count: rows.length,
            rows,
          },
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        step: "catch",
        error: err.message,
      }),
    };
  }
};
