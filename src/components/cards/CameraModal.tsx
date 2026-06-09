"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { X, RefreshCw } from "lucide-react";

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraModal({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hwZoomRef = useRef<{ min: number; max: number } | null>(null);
  const zoomRef = useRef(1);
  const pinchRef = useRef<{ dist: number; startZoom: number } | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);

  const applyZoom = useCallback((value: number) => {
    const hwRange = hwZoomRef.current;
    const max = hwRange ? Math.min(hwRange.max, 8) : 3;
    const clamped = Math.max(1, Math.min(max, value));
    zoomRef.current = clamped;
    setZoom(clamped);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track && hwRange) {
      track
        .applyConstraints({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advanced: [{ zoom: Math.max(hwRange.min, Math.min(hwRange.max, clamped)) } as any],
        })
        .catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.style.transform = clamped > 1 ? `scale(${clamped})` : "";
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "environment" | "user") => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setReady(false);
      setError(null);
      setZoom(1);
      zoomRef.current = 1;
      hwZoomRef.current = null;
      setMaxZoom(3);
      if (videoRef.current) {
        videoRef.current.style.transform = "";
        videoRef.current.srcObject = null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caps = track.getCapabilities() as any;
        if (caps?.zoom) {
          hwZoomRef.current = { min: caps.zoom.min, max: caps.zoom.max };
          setMaxZoom(Math.min(caps.zoom.max, 8));
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setError("카메라를 열 수 없어요.\n권한을 확인해 주세요.");
      }
    },
    []
  );

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [facingMode, startCamera]);

  // 핀치 줌 — passive: false 필수
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDist = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchRef.current = { dist: getDist(e.touches), startZoom: zoomRef.current };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        applyZoom(pinchRef.current.startZoom * (getDist(e.touches) / pinchRef.current.dist));
      }
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyZoom]);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth;
    const h = video.videoHeight;

    // CSS 줌 사용 시 중앙 크롭, 하드웨어 줌은 그대로
    const currentZoom = zoomRef.current;
    const isHw = !!hwZoomRef.current;
    const sw = isHw || currentZoom <= 1 ? w : Math.round(w / currentZoom);
    const sh = isHw || currentZoom <= 1 ? h : Math.round(h / currentZoom);
    const sx = Math.round((w - sw) / 2);
    const sy = Math.round((h - sh) / 2);

    try {
      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(sw, sh);
        canvas.getContext("2d")!.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
        onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        canvas.getContext("2d")!.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
        canvas.toBlob(
          (blob) => { if (blob) onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" })); },
          "image/jpeg",
          0.85
        );
      }
    } catch {
      setError("사진 촬영에 실패했어요.");
    }
  }

  const zoomLevels = [1, 2, ...(maxZoom >= 3 ? [3] : [])];

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-4 shrink-0 bg-black"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}
      >
        <button onClick={onCancel} className="w-11 h-11 flex items-center justify-center text-white/80">
          <X size={24} />
        </button>
        <button
          onClick={() => setFacingMode((f) => (f === "environment" ? "user" : "environment"))}
          className="w-11 h-11 flex items-center justify-center text-white/80"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* 카메라 프리뷰 */}
      {error ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <p className="text-white text-center whitespace-pre-line">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setReady(true)}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div
        className="flex flex-col items-center gap-5 bg-black shrink-0"
        style={{ paddingTop: 20, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
      >
        {/* 줌 버튼 */}
        {ready && (
          <div className="flex items-center gap-2">
            {zoomLevels.map((level) => {
              const active = Math.abs(zoom - level) < 0.15;
              return (
                <button
                  key={level}
                  onClick={() => applyZoom(level)}
                  className={`min-w-[44px] h-[44px] px-2 rounded-full text-sm font-bold transition-all duration-150 ${
                    active
                      ? "bg-white/10 text-yellow-400 ring-1 ring-yellow-400/60 scale-110"
                      : "text-white/70"
                  }`}
                >
                  {level}×
                </button>
              );
            })}
          </div>
        )}

        {/* 셔터 */}
        <button
          onClick={handleCapture}
          disabled={!ready}
          className="w-[72px] h-[72px] rounded-full border-4 border-white bg-white/20 disabled:opacity-30 active:scale-95 transition-transform"
        >
          <div className="w-full h-full rounded-full bg-white scale-[0.82]" />
        </button>
      </div>
    </div>
  );
}
