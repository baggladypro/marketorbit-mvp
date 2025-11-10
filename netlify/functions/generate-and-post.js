// netlify/functions/generate-and-post.js

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const topic = body.topic || "Sample post from MarketOrbit MVP";
    const mode = body.mode || "draft"; // "draft" or "post"

    // 1) generate AI caption (or fallback)
    const openaiKey = process.env.OPENAI_API_KEY;
    let caption = `Post about: ${topic}`;

    if (openaiKey) {
      const prompt = `Write a short social media post about: ${topic}. Make it friendly, helpful, and add 2-3 relevant hashtags.`;
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      }).then((r) => r.json()).catch(() => null);

      const maybeText = aiRes?.choices?.[0]?.message?.content?.trim();
      if (maybeText) caption = maybeText;
    }

    // 2) if mode = post, try Facebook
    let fbResult = null;
    if (mode === "post") {
      const pageId = process.env.FB_PAGE_ID;
      const fbToken = process.env.META_PAGE_ACCESS_TOKEN;

      if (!pageId || !fbToken) {
        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              ok: false,
              stage: "post-to-facebook",
              errorCode: "FB_CONFIG_MISSING",
              message: "Facebook is not configured in Netlify (missing FB_PAGE_ID or META_PAGE_ACCESS_TOKEN).",
              caption,
            },
            null,
            2
          ),
        };
      }

      fbResult = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: caption,
          access_token: fbToken,
        }),
      }).then((r) => r.json());

      if (fbResult?.error) {
        const msg = fbResult.error.message || "";
        let code = "FB_UNKNOWN_ERROR";
        let friendly = "Facebook returned an unexpected error. Try reconnecting.";

        if (msg.includes("expired")) {
          code = "FB_TOKEN_EXPIRED";
          friendly = "Your Facebook connection has expired. Please get a new Page token and update Netlify.";
        } else if (msg.includes("requires both") || msg.includes("pages_manage_posts")) {
          code = "FB_MISSING_PERMS";
          friendly = "Facebook didn’t give MarketOrbit permission to post to this Page. Reconnect and select this Page.";
        } else if (msg.includes("administrative permission")) {
          code = "FB_NOT_PAGE_ADMIN";
          friendly = "Facebook says you’re not an admin for this Page. Use a Page where you have full control.";
        }

        return {
          statusCode: 200,
          body: JSON.stringify(
            {
              ok: false,
              stage: "post-to-facebook",
              errorCode: code,
              message: friendly,
              fbRaw: fbResult,
              caption,
            },
            null,
            2
          ),
        };
      }
    }

    // 3) optional Supabase save (safe/no crash)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/posts`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            content: caption,
            platform: "facebook",
            status: mode === "post" ? "posted" : "draft",
          }),
        });
      } catch (e) {
        // ignore for now
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          ok: true,
          stage: mode === "post" ? "posted" : "draft-generated",
          caption,
          fbRes: fbResult,
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }, null, 2),
    };
  }
};
