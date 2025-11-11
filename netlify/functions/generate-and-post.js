// netlify/functions/generate-and-post.js

// ------------------------------------------------------
// 1) helper to write to Supabase activity_logs
// ------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// this writes ONE row into public.activity_logs
async function logActivity(entry) {
  // if env vars aren’t there, just skip (don’t crash the function)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.log("logActivity: missing Supabase env vars, skipping log.", entry);
    return;
  }

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        action: entry.action,                   // e.g. "generate_draft" or "post_to_facebook"
        topic: entry.topic || "",
        caption: entry.caption || "",
        status: entry.status || "ok",
        provider: entry.provider || "netlify",
        raw: entry.raw ?? null,
      }),
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}

// ------------------------------------------------------
// 2) Netlify function entry
// ------------------------------------------------------
export async function handler(event, context) {
  // only allow POST from the page
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: "POST only" }),
    };
  }

  // get data sent from the page
  const { topic, mode } = JSON.parse(event.body || "{}");
  // mode will be "draft" OR "post" from your UI

  // ----------------------------------------------------
  // 3) build the caption (same one you saw working)
  // ----------------------------------------------------
  const caption =
    `🌟 Exciting news from MarketOrbit MVP! 💥 We’re thrilled to help you elevate your marketing game with our intuitive tools and insights. Whether you're a small business or a marketing pro, we've got something for everyone! Let’s connect and grow together! 💪✨ #MarketingMadeEasy #MarketOrbitMVP` +
    (topic ? ` #${topic.replace(/\s+/g, "")}` : "");

  // ----------------------------------------------------
  // 4) (optional) here is where real FB posting would go
  // right now we just pretend and return null
  // ----------------------------------------------------
  const fbRes = null;

  // ----------------------------------------------------
  // 5) this is what we send BACK to the browser
  // ----------------------------------------------------
  const payload = {
    ok: true,
    // show a different label in the UI depending on what they clicked
    stage: mode === "post" ? "post-to-facebook" : "draft-generated",
    topic: topic || "",
    caption,
    fbRes, // still null for now
  };

  // ----------------------------------------------------
  // 6) write this action to Supabase
  // we do it AFTER we build payload, so we can re-use values
  // ----------------------------------------------------
  await logActivity({
    action: mode === "post" ? "post_to_facebook" : "generate_draft",
    topic,
    caption,
    status: "ok",
    provider: mode === "post" ? "facebook" : "openai",
    raw: payload, // nice to store what we returned
  });

  // ----------------------------------------------------
  // 7) return to browser
  // ----------------------------------------------------
  return {
    statusCode: 200,
    body: JSON.stringify(payload),
  };
}
