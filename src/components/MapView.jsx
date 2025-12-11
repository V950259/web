import { useEffect, useRef } from "react";

// 高德 Web 端 JS Key（来自用户提供）
const AMAP_KEY = "5e910511665ddb4dfec1f953588862d3";

/**
 * MapView 支持基础展示与规划路线绘制
 */
export default function MapView({
  center = [116.397428, 39.90923],
  zoom = 11,
  routePoints = [],
  travelMode = "driving", // driving | walking | riding
  centerOverride,
  trafficOn = false,
  onMapReady
}) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const servicesRef = useRef({ driving: null, walking: null });
  const overlayRef = useRef([]); // 记录 marker/线，便于清理
  const routeRequestTimerRef = useRef(null); // 防抖定时器
  const isRequestingRef = useRef(false); // 请求状态锁
  const lastRouteKeyRef = useRef(""); // 上次路线标识，避免重复请求
  const trafficLayerRef = useRef(null); // 路况图层
  const userLocationMarkerRef = useRef(null); // 用户位置标记
  const isLocatingRef = useRef(false); // 是否正在定位，防止其他逻辑覆盖定位结果

  // 加载 SDK 并初始化地图
  useEffect(() => {
    // 确保安全密钥配置已设置（如果 index.html 未设置，这里兜底）
    if (!window._AMapSecurityConfig) {
      window._AMapSecurityConfig = {
        securityJsCode: "b88eb512f5affe3f2fed134076453e62"
      };
    }

    const scriptId = "amap-sdk";
    const existingScript = document.getElementById(scriptId);
    
    // 如果 SDK 已加载且 AMap 对象存在，直接初始化
    if (existingScript && window.AMap) {
      initMap();
      return;
    }

    // 如果脚本标签已存在但 SDK 未加载完成，等待加载
    if (existingScript && !window.AMap) {
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // 创建新的脚本标签加载 SDK
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    script.async = true;
    
    script.onload = () => {
      if (window.AMap) {
        initMap();
      } else {
        console.error("高德地图 SDK 加载失败：AMap 对象未找到");
      }
    };
    
    script.onerror = () => {
      console.error("高德地图 SDK 脚本加载失败，请检查网络连接和 Key 配置");
    };
    
    document.head.appendChild(script);

    function initMap() {
      if (!window.AMap || !mapContainerRef.current) return;
      if (mapInstance.current) return;
      
      try {
        mapInstance.current = new window.AMap.Map(mapContainerRef.current, {
          viewMode: "2D",
          zoom,
          center
        });
        // 默认中心点标记
        const marker = new window.AMap.Marker({ position: center, map: mapInstance.current });
        overlayRef.current.push(marker);

        // 回调上抛 map 实例
        onMapReady?.(mapInstance.current);
      } catch (error) {
        console.error("地图初始化失败：", error);
      }
    }
  }, [center, zoom]);

  // 监听窗口大小变化，自动调整地图尺寸
  useEffect(() => {
    const handleResize = () => {
      if (mapInstance.current) {
        setTimeout(() => {
          mapInstance.current?.resize();
        }, 100);
      }
    };

    const handleOrientationChange = () => {
      setTimeout(handleResize, 200);
    };

    // 延迟添加监听器，确保地图已初始化
    const timer = setTimeout(() => {
      if (mapInstance.current) {
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // 外部中心点更新（定位功能）
  useEffect(() => {
    if (!centerOverride || !mapInstance.current || !window.AMap) {
      isLocatingRef.current = false;
      return;
    }
    const map = mapInstance.current;
    
    // 设置定位标志，防止其他逻辑覆盖定位结果
    isLocatingRef.current = true;
    
    // 清理旧的用户位置标记
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setMap(null);
      userLocationMarkerRef.current = null;
    }
    
    // 立即设置地图中心点和缩放级别（定位时固定使用15级缩放）
    map.setZoom(15);
    map.setCenter(centerOverride);
    
    // 添加用户位置标记
    userLocationMarkerRef.current = new window.AMap.Marker({
      position: centerOverride,
      map,
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(40, 40),
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/loc.png',
        imageSize: new window.AMap.Size(40, 40)
      }),
      title: '我的位置'
    });
    
    // 将用户位置标记添加到覆盖物列表，便于后续清理
    overlayRef.current.push(userLocationMarkerRef.current);
    
    // 延迟再次确认定位位置，防止被其他逻辑覆盖
    const confirmTimer = setTimeout(() => {
      if (mapInstance.current && centerOverride && isLocatingRef.current) {
        mapInstance.current.setZoom(15);
        mapInstance.current.setCenter(centerOverride);
      }
    }, 200);
    
    // 定位完成后，延迟释放定位锁，允许路线更新（延迟800ms，确保定位位置不会被覆盖）
    const releaseTimer = setTimeout(() => {
      isLocatingRef.current = false;
    }, 800);
    
    // 清理函数：当 centerOverride 被清除时，移除用户位置标记
    return () => {
      clearTimeout(confirmTimer);
      clearTimeout(releaseTimer);
      isLocatingRef.current = false;
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null);
        userLocationMarkerRef.current = null;
      }
    };
  }, [centerOverride]); // 只依赖 centerOverride，不依赖 zoom

  // 路况图层开关
  useEffect(() => {
    if (!mapInstance.current || !window.AMap) return;
    if (trafficOn) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new window.AMap.TileLayer.Traffic({ zIndex: 10 });
      }
      trafficLayerRef.current.setMap(mapInstance.current);
    } else {
      trafficLayerRef.current?.setMap(null);
    }
  }, [trafficOn]);

  // 监听路线点位变化，绘制路径（添加防抖和请求控制）
  useEffect(() => {
    if (!window.AMap || !mapInstance.current) return;
    
    // 如果正在定位过程中（isLocatingRef.current 为 true），跳过路线更新逻辑
    // 但定位完成后（isLocatingRef.current 为 false），即使 centerOverride 存在，也应该允许路线更新
    if (isLocatingRef.current) {
      return;
    }
    
    const map = mapInstance.current;

    // 清理旧覆盖物（但保留用户位置标记）
    overlayRef.current.forEach((o) => {
      // 如果不是用户位置标记，则清理
      if (o !== userLocationMarkerRef.current) {
        o?.setMap?.(null);
      }
    });
    // 重新构建覆盖物数组，保留用户位置标记
    overlayRef.current = userLocationMarkerRef.current 
      ? [userLocationMarkerRef.current] 
      : [];

    // 如果只有一个点或无点，则仅标记中心
    if (!routePoints || routePoints.length === 0) {
      const marker = new window.AMap.Marker({ position: center, map });
      overlayRef.current.push(marker);
      // 如果有 centerOverride 或正在定位，不自动设置中心点（保持用户定位位置）
      if (!centerOverride && !isLocatingRef.current) {
        map.setCenter(center);
        map.setZoom(zoom);
      }
      isRequestingRef.current = false;
      lastRouteKeyRef.current = "";
      return;
    }

    // 标记所有点
    routePoints.forEach((p, idx) => {
      const marker = new window.AMap.Marker({
        position: p.position,
        map,
        label: { content: p.name || `点位${idx + 1}`, direction: "top" }
      });
      overlayRef.current.push(marker);
    });

    if (routePoints.length < 2) {
      // 如果有 centerOverride 或正在定位，不自动调整视图（保持用户定位位置）
      if (!centerOverride && !isLocatingRef.current) {
        map.setFitView();
      }
      isRequestingRef.current = false;
      lastRouteKeyRef.current = "";
      return;
    }

    // 生成路线唯一标识，避免重复请求
    const routeKey = `${travelMode}-${routePoints.map(p => `${p.position[0]},${p.position[1]}`).join("|")}`;
    if (routeKey === lastRouteKeyRef.current && isRequestingRef.current) {
      return; // 相同路线且正在请求中，跳过
    }

    // 清除之前的防抖定时器
    if (routeRequestTimerRef.current) {
      clearTimeout(routeRequestTimerRef.current);
    }

    // 防抖：延迟 300ms 执行，避免频繁触发
    routeRequestTimerRef.current = setTimeout(() => {
      if (isRequestingRef.current) {
        console.warn("上一个路线请求仍在进行中，跳过本次请求");
        return;
      }

      isRequestingRef.current = true;
      lastRouteKeyRef.current = routeKey;

    // 规划路线
    const mode = travelMode === "walking" ? "walking" : travelMode === "riding" ? "riding" : "driving";
    window.AMap.plugin(["AMap.Driving", "AMap.Walking", "AMap.Riding"], () => {
        // 实例化一次，复用
        if (mode === "driving" && !servicesRef.current.driving) {
          servicesRef.current.driving = new window.AMap.Driving({ map });
        }
        if (mode === "walking" && !servicesRef.current.walking) {
          servicesRef.current.walking = new window.AMap.Walking({ map });
        }
      if (mode === "riding" && !servicesRef.current.riding) {
        servicesRef.current.riding = new window.AMap.Riding({ map });
      }

      const service =
        mode === "driving"
          ? servicesRef.current.driving
          : mode === "riding"
            ? servicesRef.current.riding
            : servicesRef.current.walking;
        if (!service) {
          isRequestingRef.current = false;
          return;
        }

        // 部分版本提供 clear 方法，尝试清理旧线路
        service.clear?.();

        const origin = routePoints[0].position;
        const destination = routePoints[routePoints.length - 1].position;
        const waypoints = routePoints.slice(1, -1).map((p) => p.position);

        service.search(origin, destination, { waypoints }, (status, result) => {
          isRequestingRef.current = false; // 请求完成，释放锁

          if (status === "complete") {
            // 如果有 centerOverride 或正在定位，不自动调整视图（保持用户定位位置）
            if (!centerOverride && !isLocatingRef.current) {
              map.setFitView();
            }
          } else if (status === "error" && result?.info?.includes("CUQPS_HAS_EXCEEDED_THE_LIMIT")) {
            console.warn("请求频率超限，请稍后再试", result);
            // 可以在这里添加用户提示
          } else {
            console.warn("规划失败", status, result);
          }
        });
      });
    }, 300);

    // 清理函数
    return () => {
      if (routeRequestTimerRef.current) {
        clearTimeout(routeRequestTimerRef.current);
      }
    };
  }, [center, zoom, routePoints, travelMode, centerOverride]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      style={{ 
        touchAction: 'none',
        overflow: 'hidden',
        position: 'relative'
      }}
      onTouchMove={(e) => {
        // 防止页面滚动导致的回弹
        if (e.target === mapContainerRef.current || mapContainerRef.current?.contains(e.target)) {
          // 允许地图容器内的触摸事件
          return;
        }
      }}
    />
  );
}

