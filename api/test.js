export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json({ message: "API 路由工作正常！", timestamp: new Date().toISOString() });
}

