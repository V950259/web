// Vercel Serverless Function (Node.js runtime)
const SYSTEM_PROMPT = `
你是"AI 灵感路线规划助手"。请严格输出 JSON，格式：
{
  "title": "路线标题",
  "mode": "walking" | "driving",
  "points": [
    { "name": "地点名", "position": [经度, 纬度], "reason": "推荐理由" }
  ]
}
要求：
1) 保持 3-5 个点，按路径顺序排列。
2) 坐标使用 GCJ-02（高德可用），返回北京范围示例即可；若用户给出城市或地点偏好，则尽量靠近。
3) reason 精炼（<=20 汉字），突出该点的特色。
4) 若信息不足，基于输入关键词给出合理假设。
请仅输出 JSON（无额外文字）。
`;

// 智谱 API 配置
const API_BASE = "https://open.bigmodel.cn/api/paas/v4";
const API_KEY = "a256985d75614a2f8d94e40bc860fe0d.pDLp3m6Cvcldu8k3";
const MODEL = "glm-4-flash";

export default async function handler(req, res) {
  // CORS 支持
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { query } = req.body;
    
    console.log("AI API 调用：", { query, model: MODEL });

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: query || "生成一条北京 CBD 适合拍照的咖啡馆步行路线"
        }
      ],
      response_format: { type: "json_object" }
    };

    const resp = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI API 错误：", resp.status, text);
      return res.status(500).json({
        error: "AI 请求失败",
        detail: text,
        status: resp.status
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    
    // 解析并返回 JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.warn("AI 返回内容不是有效 JSON，尝试修复：", content);
      parsed = { error: "AI 返回格式异常", raw: content };
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Handler 错误：", err);
    return res.status(500).json({
      error: "ai_handler_error",
      detail: String(err),
      message: err.message
    });
  }
}

