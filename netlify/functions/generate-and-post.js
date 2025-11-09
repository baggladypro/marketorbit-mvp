// netlify/functions/generate-and-post.js

export const handler = async (event) => {
  try {
    // 1) read input from the browser
    const body = JSON.parse(event.body || "{}");
    const topic = body.topic || "Sample post from MarketOrbit MVP";

    // 2) build a caption (either with OpenAI or fallback)
    const openaiKey = process.env.OPENAI_API_KEY;
    let caption = `Post about: ${topic}`;

    if (openaiKey) {
      const prompt = `Write a short social media post about: ${topic}. Make it friendly and add 3 relevant hashtags.`;
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

    // 3) post to Facebook
    const pageId = process.env.FB_PAGE_ID;
    const fbToken = process.env.META_PAGE_ACCESS_TOKEN;

    if (!pageId || !fbToken) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing FB_PAGE_ID or META_PAGE_ACCESS_TOKEN in Netlify env vars",
        }),
      };
    }

    const fbRes = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: caption,
        access_token: fbToken,
      }),
    }).then((r) => r.json());

    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          ok: true,
          topic,
          caption,
          fbRes,
        },
        null,
        2
      ),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }, null, 2),
    };
  }
};
