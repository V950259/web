import { useMemo, useRef, useState } from "react";
import MapView from "../components/MapView";

// 本地 Mock，AI 异常时回退
const mockPlan = (q) => {
  const text = (q || "").toLowerCase();

  if (text.includes("咖啡")) {
    return {
      title: "国贸周边咖啡拍照半日线",
      mode: "walking",
      points: [
        { name: "国贸地铁站", position: [116.461, 39.908], reason: "集合点/交通枢纽" },
        { name: "%Arabica 国贸店", position: [116.4602, 39.9098], reason: "玻璃橱窗采光好" },
        { name: "Blue Bottle SKP-S", position: [116.4652, 39.9084], reason: "艺术感陈列" },
        { name: "爱琴海购物公园露台", position: [116.4705, 39.9092], reason: "日落天台视野" }
      ]
    };
  }

  if (text.includes("公园") || text.includes("park")) {
    return {
      title: "朝阳公园绿色慢行",
      mode: "walking",
      points: [
        { name: "朝阳公园南门", position: [116.4738, 39.933], reason: "入口集合" },
        { name: "摩天轮草坪", position: [116.4763, 39.9354], reason: "观景拍照" },
        { name: "湖畔步道", position: [116.4795, 39.9372], reason: "水景绿道" },
        { name: "北门出口", position: [116.4815, 39.9394], reason: "返程方便" }
      ]
    };
  }

  return {
    title: "CBD 夜景车巡",
    mode: "driving",
    points: [
      { name: "国贸桥", position: [116.461, 39.908], reason: "夜景起点" },
      { name: "央视大楼", position: [116.4644, 39.9155], reason: "地标打卡" },
      { name: "三里屯太古里", position: [116.4556, 39.9365], reason: "街景与餐饮" },
      { name: "工体北路", position: [116.4475, 39.9332], reason: "收尾停车方便" }
    ]
  };
};

const safeParsePlan = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed?.points?.length) return null;
    return parsed;
  } catch (err) {
    console.warn("解析 AI 结果失败，使用本地 mock", err);
    return null;
  }
};

// 直接调用智谱 API（临时方案，用于快速验证功能）
const callAIPlan = async (query) => {
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

  const API_BASE = "https://open.bigmodel.cn/api/paas/v4";
  const API_KEY = "a256985d75614a2f8d94e40bc860fe0d.pDLp3m6Cvcldu8k3";
  const MODEL = "glm-4-flash";

  try {
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

    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI API 错误：", res.status, text);
      throw new Error(`AI 请求失败：${text || `HTTP ${res.status}`}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    
    // 解析 JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.warn("AI 返回内容不是有效 JSON：", content);
      throw new Error("AI 返回格式异常");
    }

    return parsed;
  } catch (error) {
    console.error("AI 请求错误详情：", error);
    throw error;
  }
};

export default function MapPage() {
  const defaultCenter = [116.397428, 39.90923];
  const defaultZoom = 11;
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(() => mockPlan(""));
  const [error, setError] = useState("");
  const [centerOverride, setCenterOverride] = useState(null);
  const [trafficOn, setTrafficOn] = useState(false);
  const [travelMode, setTravelMode] = useState("driving"); // driving | walking | riding
  const mapRef = useRef(null);

  const handlePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const aiData = await callAIPlan(query);
      const parsed = safeParsePlan(aiData);
      if (parsed) {
        setRoute(parsed);
        setError(""); // 清除错误
      } else {
        setRoute(mockPlan(query));
        setError("AI 返回格式异常，已回退本地示范路线");
      }
    } catch (e) {
      console.error("路线生成失败：", e);
      setRoute(mockPlan(query));
      const errorMsg = e.message || "AI 请求失败";
      setError(`${errorMsg}，已回退本地示范路线`);
    } finally {
      setLoading(false);
    }
  };

  const routePoints = useMemo(() => route?.points || [], [route]);
  const mode = travelMode || route?.mode || "driving";

  const handleGeoLocate = () => {
    if (!window.AMap || !mapRef.current) {
      setError("地图未就绪，稍后再试");
      return;
    }
    window.AMap.plugin("AMap.Geolocation", () => {
      const geo = new window.AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 5000
      });
      geo.getCurrentPosition((status, result) => {
        if (status === "complete" && result?.position) {
          const pos = [result.position.lng, result.position.lat];
          setCenterOverride(pos);
          setError("");
        } else {
          setError("定位失败，已保持原位置");
        }
      });
    });
  };

  const handleRecenter = () => {
    if (!mapRef.current) {
      setError("地图未就绪，稍后再试");
      return;
    }
    setError("");
    if (routePoints.length > 0) {
      // 直接使用高德内置 fitView
      mapRef.current.setFitView();
      setCenterOverride(null);
    } else {
      // 没有路线时回到默认中心与缩放
      mapRef.current.setZoom(defaultZoom);
      mapRef.current.setCenter(defaultCenter);
      setCenterOverride(defaultCenter);
    }
  };

  return (
    <div 
      className="w-screen h-screen relative bg-gray-50"
      style={{ 
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        touchAction: 'none'
      }}
    >
      <div className="absolute top-4 left-4 z-10 w-80 max-w-full bg-white rounded-xl shadow-lg border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">AI 灵感路线</p>
            <p className="text-xs text-gray-500">输入需求，调用真实 AI 生成；失败回退本地示范</p>
          </div>
        </div>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm h-20"
          placeholder="输入你的游玩需求（例：北京国贸附近，适合拍照的咖啡馆路线）"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={handlePlan}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-60"
        >
          {loading ? "AI 生成中..." : "生成灵感路线"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-600">方式</span>
          <select
            className="border rounded px-2 py-1 text-xs flex-1"
            value={travelMode}
            onChange={(e) => setTravelMode(e.target.value)}
          >
            <option value="driving">驾车</option>
            <option value="walking">步行</option>
            <option value="riding">骑行</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            className="border rounded py-2"
            onClick={handleGeoLocate}
          >
            定位到我
          </button>
          <button
            className="border rounded py-2"
            onClick={() => setTrafficOn((v) => !v)}
          >
            {trafficOn ? "关闭路况" : "开启路况"}
          </button>
          <button
            className="border rounded py-2 col-span-2"
            onClick={handleRecenter}
          >
            重置视角
          </button>
        </div>
        <div className="border-t pt-2">
          <p className="text-sm font-semibold">{route?.title}</p>
          <p className="text-xs text-gray-500 mb-1">模式：{mode === "walking" ? "步行" : "驾车"}</p>
          <ul className="space-y-1 max-h-40 overflow-auto pr-1">
            {routePoints.map((p, idx) => (
              <li key={p.name + idx} className="text-xs text-gray-700">
                <span className="font-semibold">#{idx + 1} {p.name}</span> — {p.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div 
        className="w-full h-full"
        style={{ 
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'none'
        }}
      >
        <MapView
          center={defaultCenter}
          zoom={defaultZoom}
          routePoints={routePoints}
          travelMode={mode}
          centerOverride={centerOverride}
          trafficOn={trafficOn}
          onMapReady={(map) => {
            mapRef.current = map;
            // 初始化后立即调整地图尺寸
            setTimeout(() => {
              map.resize();
            }, 100);
          }}
        />
      </div>
    </div>
  );
}

