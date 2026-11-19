/**
 * Vercel Serverless Function: /api/ai
 * Tự động đọc GEMINI_API_KEY hoặc OPENAI_API_KEY từ Environment Variables trên Vercel.
 * Hỗ trợ:
 * 1. Chat & Phân tích tin tức chuyên sâu (POST /api/ai)
 * 2. Dịch hàng loạt tiêu đề & tóm tắt báo quốc tế sang tiếng Việt (action: "translate_batch")
 */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  const geminiModel = (process.env.GEMINI_MODEL || "gemini-3.8-flash").trim();
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

  async function runLlm(systemPrompt, userPrompt, history = [], jsonMode = false) {
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

      const generationConfig = {
        temperature: 0.25,
        maxOutputTokens: 4096
      };
      if (jsonMode) {
        generationConfig.responseMimeType = "application/json";
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: String(systemPrompt) }]
          },
          contents,
          generationConfig
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Lỗi từ Google Gemini (${response.status}): ${errText.slice(0, 220)}`);
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      return parts.map((p) => p.text || "").join("\n");
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
          temperature: 0.25
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Lỗi từ OpenAI (${response.status}): ${errText.slice(0, 220)}`);
      }

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "";
    }
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    if (body.action === "translate_batch" && Array.isArray(body.items)) {
      const sys = `Bạn là Biên tập viên Dịch thuật Báo chí Quốc tế chuyên nghiệp.
Hãy dịch danh sách các bài báo nước ngoài (tiêu đề và mô tả) sang TIẾNG VIỆT tự nhiên, chuẩn văn phong báo chí chính thống.
Giữ nguyên tên riêng quốc tế, tên tổ chức, mã chứng khoán và thuật ngữ chuyên ngành phổ biến.
Trả về một mảng JSON có cấu trúc chính xác: [{"id": "...", "titleVi": "...", "descriptionVi": "..."}]`;

      const raw = await runLlm(sys, JSON.stringify(body.items), [], true);
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const translations = JSON.parse(cleaned);
      return res.status(200).json({ translations });
    }

    const { systemPrompt = "", userPrompt = "", history = [] } = body;
    const text = await runLlm(systemPrompt, userPrompt, history, false);
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Lỗi xử lý dịch thuật / AI trên Vercel"
    });
  }
};
