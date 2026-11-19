/**
 * Vercel Serverless Function: /api/ai (Chuẩn CommonJS tương thích mặc định 100% trên Vercel)
 */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  const geminiModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
  const openaiModel = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();

  if (req.method === "GET") {
    const configured = Boolean(geminiKey || openaiKey);
    const provider = geminiKey ? "Vercel Gemini" : openaiKey ? "Vercel OpenAI" : null;
    return res.status(200).json({ configured, provider });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Phương thức không được hỗ trợ" });
  }

  if (!geminiKey && !openaiKey) {
    return res.status(503).json({
      error: "CHUA_CAU_HINH_VERCEL_ENV",
      message: "Máy chủ Vercel chưa có biến môi trường GEMINI_API_KEY hoặc OPENAI_API_KEY."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { systemPrompt = "", userPrompt = "", history = [] } = body;

    if (geminiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`;

      const contents = [];
      (Array.isArray(history) ? history.slice(-8) : []).forEach((msg) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: String(msg.text || "") }]
        });
      });
      contents.push({
        role: "user",
        parts: [{ text: String(userPrompt) }]
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: String(systemPrompt) }]
          },
          contents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          error: `Lỗi từ Google Gemini (${response.status}): ${errText.slice(0, 250)}`
        });
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || "").join("\n");
      return res.status(200).json({ text });
    }

    if (openaiKey) {
      const messages = [{ role: "system", content: String(systemPrompt) }];
      (Array.isArray(history) ? history.slice(-8) : []).forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: String(msg.text || "")
        });
      });
      messages.push({ role: "user", content: String(userPrompt) });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages,
          temperature: 0.35
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({
          error: `Lỗi từ OpenAI (${response.status}): ${errText.slice(0, 250)}`
        });
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";
      return res.status(200).json({ text });
    }
  } catch (err) {
    return res.status(500).json({
      error: "Lỗi thực thi tại Vercel Function: " + (err.message || "Không xác định")
    });
  }
};
