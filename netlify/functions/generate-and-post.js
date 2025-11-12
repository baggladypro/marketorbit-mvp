// netlify/functions/generate-and-post.js

// --- activity logging helper (shared for success + errors) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

async function logActivity(entry) {
  // if env vars are missing, don't crash the function — just log to console
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.log("logActivity: missing env vars, skipping", entry);
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
        action: entry.action,
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

// --- main function ---
export async function handler(event, context) {
 throw new Error("test error for logs");

  // we want to remember the topic even if we error
  let topicFromRequest = "";

  try {
    // only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, message: "POST only" }),
      };
    }

    // get data sent from the page
    const { topic, mode } = JSON.parse(event.body || "{}");
    topicFromRequest = topic || "";

    // ---- make the caption (same as before) ----
    const caption =
      `🌟 Exciting news from MarketOrbit MVP! 💥 We’re thrilled to help you elevate your marketing game with our intuitive tools and insights. Whether you're a small business or a marketing pro, we've got something for everyone! Let’s connect and grow together! 💪✨ #MarketingMadeEasy #MarketOrbitMVP #GrowYourBusiness` +
      (topic ? ` #${topic.replace(/\s+/g, "")}` : "");

    // ✅ SUCCESS LOG (this is the one you saw)
    await logActivity({
      action: mode === "post" ? "post_to_facebook" : "generate_draft",
      topic,
      caption,
      status: "ok",
      provider: mode === "post" ? "facebook" : "openai",
    });

    // this is what we’ll return to the UI
    const payload = {
      ok: true,
      stage: mode === "post" ? "post-to-facebook" : "draft-generated",
      topic: topic || "",
      caption,
      fbRes: null, // when FB posting is real, put its response here
    };

    return {
      statusCode: 200,
      body: JSON.stringify(payload),
    };
  } catch (err) {
    console.error("generate-and-post failed:", err);

    // ❗ ERROR LOG — this is the new part
    await logActivity({
      action: "generate_and_post",
      topic: topicFromRequest,
      caption: "",
      status: "error",
      provider: "netlify",
      raw: {
        message: err.message,
        name: err.name,
      },
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: "generate-and-post failed",
      }),
    };
  }
}
