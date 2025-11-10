// netlify/functions/generate-and-post.js

export async function handler(event, context) {
  // only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: "POST only" }),
    };
  }

  // get data sent from the page
  const { topic, mode } = JSON.parse(event.body || "{}");

  // ---- make the caption (same as before) ----
  const caption =
    `🌟 Exciting news from MarketOrbit MVP! 💥 We’re thrilled to help you elevate your marketing game with our intuitive tools and insights. Whether you're a small business or a marketing pro, we've got something for everyone! Let’s connect and grow together! 💪✨ #MarketingMadeEasy #MarketOrbitMVP #GrowYourBusiness` +
    (topic ? ` #${topic.replace(/\s+/g, "")}` : "");

  // this is what we’ll return to the UI
  const payload = {
    ok: true,
    stage: mode === "post" ? "post-to-facebook" : "draft-generated",
    topic: topic || "",
    caption,
    fbRes: null, // you can swap this once FB posting is fixed
  };

  // ---- log to Supabase ------------------------------------------------
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          action: mode === "post" ? "post_to_facebook" : "generate_draft",
          topic: topic || "",
          caption,
          status: "ok",
          provider: "local",
          raw: payload,
        }),
      });
    } catch (err) {
      // don’t break the user if logging fails
      console.log("supabase log failed:", err.message);
    }
  } else {
    console.log("no supabase env vars found, skipping log");
  }
  // ---------------------------------------------------------------------


  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
}
