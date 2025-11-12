// netlify/functions/generate-and-post.js

// --- activity logging helper ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

async function logActivity(entry) {
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

export async function handler(event, context) {
  let topicFromRequest = "";

  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ ok: false, message: "POST only" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { topic = "", mode = "draft" } = body;
    topicFromRequest = topic;

    // ✅ BREAK-ON-DEMAND: if you pass topic "__break" OR query ?break=1, we force an error
    const url = new URL(event.rawUrl || "http://localhost");
    const breakFlag = url.searchParams.get("break") === "1" || topic === "__break";
    if (breakFlag) {
      throw new Error("forced test error");
    }

    // Build caption (same as before)
    const caption =
      `🌟 Exciting news from MarketOrbit MVP! 💥 We’re thrilled to help you elevate your marketing game with our intuitive tools and insights. Whether you're a small business or a marketing pro, we've got something for everyone! Let’s connect and grow together! 💪✨ #MarketingMadeEasy #MarketOrbitMVP #GrowYourBusiness` +
      (topic ? ` #${topic.replace(/\s+/g, "")}` : "");

    // (Future) Post to Facebook here; for now, mock:
    const fbRes = null;

    // Response back to UI
    const payload = {
      ok: true,
      stage: mode === "post" ? "post-to-facebook" : "draft-generated",
      topic,
      caption,
      fbRes,
    };

    // Success log
    await logActivity({
      action: mode === "post" ? "post_to_facebook" : "generate_draft",
      topic,
      caption,
      status: "ok",
      provider: mode === "post" ? "facebook" : "openai",
      raw: payload,
    });

    return { statusCode: 200, body: JSON.stringify(payload) };

  } catch (err) {
    console.error("generate-and-post failed:", err);

    // Error log
    await logActivity({
      action: "generate_and_post",
      topic: topicFromRequest,
      caption: "",
      status: "error",
      provider: "netlify",
      raw: { message: err.message, name: err.name },
    });

    return { statusCode: 500, body: JSON.stringify({ ok: false, message: "generate-and-post failed" }) };
  }
}
