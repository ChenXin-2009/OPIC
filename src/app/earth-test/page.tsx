"use client";

import { useEffect, useRef, useState } from "react";
import { EarthManager } from "@/earth/earth-manager";
import { GIBS_LAYER_PRESETS } from "@/earth/gibs-provider-factory";
import { DATE_CONSTANTS } from "@/earth/time-controller";

export default function EarthTestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const earthManagerRef = useRef<EarthManager | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [selectedDate, setSelectedDate] = useState(DATE_CONSTANTS.getDefaultDate());
  const [selectedLayer, setSelectedLayer] = useState("MODIS_TERRA_TRUE_COLOR");
  const [cameraPosition, setCameraPosition] = useState({ lon: 0, lat: 0, height: 0 });
  const [tileStats, setTileStats] = useState({ loaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || initialized) return;

    const initEarth = async () => {
      try {
        const manager = new EarthManager({
          container: containerRef.current!,
          enableUI: true,
          performanceMode: "balanced",
        });

        manager.onError((err) => {
          setError(err.message);
        });

        await manager.initialize();
        earthManagerRef.current = manager;

        // 加载默认图层
        await manager.layerManager.addLayer({
          layerName: selectedLayer,
          date: selectedDate,
        });

        // 更新相机位置
        const updateCamera = () => {
          const pos = manager.cameraController.getPosition();
          setCameraPosition({
            lon: pos.longitude.toFixed(2),
            lat: pos.latitude.toFixed(2),
            height: Math.round(pos.height),
          });
        };

        updateCamera();
        const interval = setInterval(updateCamera, 1000);

        setInitialized(true);

        return () => {
          clearInterval(interval);
          manager.destroy();
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    initEarth();
  }, []);

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);

    if (earthManagerRef.current) {
      try {
        await earthManagerRef.current.timeController.setDate(newDate);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const handleLayerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLayer = e.target.value;
    setSelectedLayer(newLayer);

    if (earthManagerRef.current) {
      try {
        const activeLayer = earthManagerRef.current.layerManager.getActiveLayer();
        if (activeLayer) {
          earthManagerRef.current.layerManager.removeLayer(activeLayer);
        }

        await earthManagerRef.current.layerManager.addLayer({
          layerName: newLayer,
          date: selectedDate,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="bg-gray-800 p-4 text-white">
        <h1 className="text-2xl font-bold">NASA GIBS 地球测试页面</h1>
        
        <div className="mt-4 flex gap-4">
          <div>
            <label className="block text-sm">日期选择：</label>
            <input
              type="date"
              value={selectedDate.toISOString().split("T")[0]}
              min={DATE_CONSTANTS.MIN_DATE.toISOString().split("T")[0]}
              max={DATE_CONSTANTS.getMaxDate().toISOString().split("T")[0]}
              onChange={handleDateChange}
              className="rounded border px-2 py-1 text-black"
            />
          </div>

          <div>
            <label className="block text-sm">图层选择：</label>
            <select
              value={selectedLayer}
              onChange={handleLayerChange}
              className="rounded border px-2 py-1 text-black"
            >
              {Object.entries(GIBS_LAYER_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold">相机位置：</h3>
            <p>经度: {cameraPosition.lon}°</p>
            <p>纬度: {cameraPosition.lat}°</p>
            <p>高度: {cameraPosition.height} m</p>
          </div>

          <div>
            <h3 className="font-semibold">瓦片统计：</h3>
            <p>已加载: {tileStats.loaded}</p>
            <p>总计: {tileStats.total}</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded bg-red-600 p-2 text-sm">
            错误: {error}
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
