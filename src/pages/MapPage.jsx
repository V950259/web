import { useMemo, useRef, useState, useEffect } from "react";
import MapView from "../components/MapView";

// 优惠券数据池
const couponPool = [
  { title: "瑞幸咖啡(顺路店)", offer: "9.9元券", type: "coffee" },
  { title: "星巴克(国贸店)", offer: "买一送一", type: "coffee" },
  { title: "肯德基(附近店)", offer: "满30减10", type: "food" },
  { title: "麦当劳(顺路店)", offer: "早餐套餐8折", type: "food" },
  { title: "7-Eleven便利店", offer: "满20减5", type: "convenience" },
  { title: "屈臣氏(附近)", offer: "第二件半价", type: "retail" }
];

// 在路线中插入优惠券
const insertCoupons = (points) => {
  if (!points || points.length < 2) return points;
  
  const newPoints = [...points];
  const couponCount = Math.random() > 0.5 ? 2 : 1; // 随机1-2个优惠券
  const insertedIndices = new Set();
  
  for (let i = 0; i < couponCount; i++) {
    // 随机选择插入位置（不在第一个和最后一个）
    let insertIndex;
    do {
      insertIndex = Math.floor(Math.random() * (newPoints.length - 2)) + 1;
    } while (insertIndex === 0 || insertIndex === newPoints.length - 1 || insertedIndices.has(insertIndex));
    
    insertedIndices.add(insertIndex);
    
    // 获取附近点的位置，生成优惠券位置（稍微偏移）
    const nearbyPoint = newPoints[insertIndex];
    const offset = 0.001; // 约100米偏移
    const coupon = couponPool[Math.floor(Math.random() * couponPool.length)];
    
    const couponData = {
      type: "ad",
      name: coupon.title,
      title: coupon.title,
      offer: coupon.offer,
      position: [
        nearbyPoint.position[0] + (Math.random() - 0.5) * offset * 2,
        nearbyPoint.position[1] + (Math.random() - 0.5) * offset * 2
      ],
      reason: `顺路优惠：${coupon.offer}`
    };
    
    // 插入到该点之后
    newPoints.splice(insertIndex + 1, 0, couponData);
  }
  
  return newPoints;
};

// 本地 Mock，AI 异常时回退
const mockPlan = (q) => {
  const text = (q || "").toLowerCase();
  let basePlan;

  if (text.includes("咖啡")) {
    basePlan = {
      title: "国贸周边咖啡拍照半日线",
      mode: "walking",
      points: [
        { name: "国贸地铁站", position: [116.461, 39.908], reason: "集合点/交通枢纽" },
        { name: "%Arabica 国贸店", position: [116.4602, 39.9098], reason: "玻璃橱窗采光好" },
        { name: "Blue Bottle SKP-S", position: [116.4652, 39.9084], reason: "艺术感陈列" },
        { name: "爱琴海购物公园露台", position: [116.4705, 39.9092], reason: "日落天台视野" }
      ]
    };
  } else if (text.includes("公园") || text.includes("park")) {
    basePlan = {
      title: "朝阳公园绿色慢行",
      mode: "walking",
      points: [
        { name: "朝阳公园南门", position: [116.4738, 39.933], reason: "入口集合" },
        { name: "摩天轮草坪", position: [116.4763, 39.9354], reason: "观景拍照" },
        { name: "湖畔步道", position: [116.4795, 39.9372], reason: "水景绿道" },
        { name: "北门出口", position: [116.4815, 39.9394], reason: "返程方便" }
      ]
    };
  } else {
    basePlan = {
      title: "CBD 夜景车巡",
      mode: "driving",
      points: [
        { name: "国贸桥", position: [116.461, 39.908], reason: "夜景起点" },
        { name: "央视大楼", position: [116.4644, 39.9155], reason: "地标打卡" },
        { name: "三里屯太古里", position: [116.4556, 39.9365], reason: "街景与餐饮" },
        { name: "工体北路", position: [116.4475, 39.9332], reason: "收尾停车方便" }
      ]
    };
  }

  // 插入优惠券
  basePlan.points = insertCoupons(basePlan.points);
  return basePlan;
};

const safeParsePlan = (raw) => {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed?.points?.length) return null;
    
    // 为AI生成的路线也插入优惠券
    parsed.points = insertCoupons(parsed.points);
    
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
  const [isListening, setIsListening] = useState(false); // 语音识别状态
  const [speechSupported, setSpeechSupported] = useState(false); // 浏览器是否支持语音识别
  const [selectedCoupon, setSelectedCoupon] = useState(null); // 选中的优惠券
  const recognitionRef = useRef(null); // 语音识别实例
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

  // 检查浏览器是否支持语音识别
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      // 初始化语音识别
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // 不连续识别
      recognition.interimResults = false; // 不返回临时结果
      recognition.lang = "zh-CN"; // 设置语言为中文
      recognition.maxAlternatives = 1; // 只返回最佳结果

      recognition.onstart = () => {
        console.log("语音识别开始");
        setIsListening(true);
        setError(""); // 清除之前的错误
      };

      recognition.onresult = (event) => {
        console.log("语音识别结果：", event);
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        
        console.log("识别到的文字：", transcript);
        
        if (transcript.trim()) {
          const recognizedText = transcript.trim();
          setQuery(recognizedText);
          setError(""); // 清除错误
          // 自动生成路线（使用识别到的文本）
          setTimeout(async () => {
            setLoading(true);
            try {
              const aiData = await callAIPlan(recognizedText);
              const parsed = safeParsePlan(aiData);
              if (parsed) {
                setRoute(parsed);
                setError("");
              } else {
                setRoute(mockPlan(recognizedText));
                setError("AI 返回格式异常，已回退本地示范路线");
              }
            } catch (e) {
              console.error("路线生成失败：", e);
              setRoute(mockPlan(recognizedText));
              const errorMsg = e.message || "AI 请求失败";
              setError(`${errorMsg}，已回退本地示范路线`);
            } finally {
              setLoading(false);
            }
          }, 100);
        } else {
          setError("未识别到有效内容，请重试");
        }
      };

      recognition.onerror = (event) => {
        console.error("语音识别错误：", event.error, event);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setError("请允许浏览器使用麦克风权限");
        } else if (event.error === "no-speech") {
          setError("未检测到语音，请重试");
        } else if (event.error === "aborted") {
          // 用户主动停止，不显示错误
          console.log("语音识别已停止");
        } else {
          setError(`语音识别失败：${event.error}，请重试`);
        }
      };

      recognition.onend = () => {
        console.log("语音识别结束");
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("浏览器不支持语音识别 API");
    }
  }, []);

  // 开始语音识别（按住说话）
  const handleSpeechStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!speechSupported) {
      setError("您的浏览器不支持语音输入功能");
      return;
    }

    if (recognitionRef.current) {
      try {
        // 如果已经在识别中，先停止
        if (isListening) {
          recognitionRef.current.stop();
        }
        // 延迟一点再开始，确保之前的识别完全停止
        setTimeout(() => {
          recognitionRef.current.start();
        }, 100);
      } catch (e) {
        console.error("启动语音识别失败：", e);
        setError("启动语音识别失败，请重试");
      }
    }
  };

  // 停止语音识别（松开）
  const handleSpeechEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("停止语音识别失败：", e);
      }
    }
  };

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

  // 处理优惠券点击
  const handleCouponClick = (coupon) => {
    setSelectedCoupon(coupon);
  };

  // 一键领取并导航
  const handleClaimAndNavigate = () => {
    if (!selectedCoupon || !mapRef.current) return;
    
    // 模拟领取优惠券
    alert(`🎉 优惠券已领取！\n${selectedCoupon.title}\n${selectedCoupon.offer}`);
    
    // 导航到优惠券位置
    if (selectedCoupon.position && selectedCoupon.position.length === 2) {
      mapRef.current.setCenter(selectedCoupon.position);
      mapRef.current.setZoom(16);
      
      // 使用高德地图导航（如果安装了高德地图APP）
      const [lng, lat] = selectedCoupon.position;
      const navUrl = `https://uri.amap.com/navigation?to=${lng},${lat}&toName=${encodeURIComponent(selectedCoupon.title)}&mode=car`;
      
      // 尝试打开高德地图APP，失败则打开网页版
      window.open(navUrl, '_blank');
    }
    
    setSelectedCoupon(null);
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
        <div className="relative">
          <textarea
            className="w-full border rounded-lg px-3 py-2 pr-10 text-sm h-20"
            placeholder="输入你的游玩需求（例：北京国贸附近，适合拍照的咖啡馆路线）"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {speechSupported && (
            <button
              type="button"
              className={`absolute right-2 top-2 p-2 rounded-full transition-all ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              onMouseDown={handleSpeechStart}
              onMouseUp={handleSpeechEnd}
              onMouseLeave={handleSpeechEnd}
              onTouchStart={(e) => {
                e.preventDefault();
                handleSpeechStart(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSpeechEnd(e);
              }}
              title={isListening ? "正在录音..." : "按住说话"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </button>
          )}
        </div>
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
            {routePoints.map((p, idx) => {
              const isCoupon = p.type === "ad";
              return (
                <li 
                  key={p.name + idx} 
                  className={`text-xs ${isCoupon ? 'bg-yellow-50 border-l-2 border-yellow-400 pl-2 py-1' : 'text-gray-700'}`}
                >
                  {isCoupon ? (
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-600 font-bold">🎁</span>
                      <span className="font-semibold text-yellow-700">{p.name}</span>
                      <span className="text-yellow-600">— {p.offer}</span>
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold">#{idx + 1} {p.name}</span> — {p.reason}
                    </span>
                  )}
                </li>
              );
            })}
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
          onCouponClick={handleCouponClick}
        />
        
        {/* 优惠券卡片 */}
        {selectedCoupon && (
          <div className="absolute top-4 right-4 z-20 w-72 bg-white rounded-xl shadow-2xl border-2 border-yellow-400 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-lg font-bold">{selectedCoupon.title}</p>
                  <p className="text-sm opacity-90 mt-1">{selectedCoupon.offer}</p>
                </div>
                <button
                  onClick={() => setSelectedCoupon(null)}
                  className="text-white hover:text-gray-200 text-xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>顺路推荐，距离路线约100米</span>
              </div>
              <div className="border-t pt-3">
                <button
                  onClick={handleClaimAndNavigate}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold py-3 rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all shadow-lg"
                >
                  🎁 一键领取并导航
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                点击领取后自动跳转导航
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

