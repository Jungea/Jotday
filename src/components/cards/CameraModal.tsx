"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import { X, RefreshCw, Zap, ZapOff, Grid3x3, Timer } from "lucide-react";

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

interface MediaTrackCapabilitiesExtended extends MediaTrackCapabilities {
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
  focusMode?: string[];
}

export function CameraModal({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hwZoomRef = useRef<{ min: number; max: number } | null>(null);
  const focusSupportedRef = useRef(false);
  const zoomRef = useRef(1);
  const pinchRef = useRef<{ dist: number; startZoom: number } | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomLabelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(3);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [grid, setGrid] = useState(true);
  const [timerMode, setTimerMode] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [zoomLabel, setZoomLabel] = useState<string | null>(null);
  const [focusIndicator, setFocusIndicator] = useState<{ x: number; y: number; fade: boolean } | null>(null);
  const [vfRect, setVfRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const applyZoom = useCallback((value: number) => {
    const hwRange = hwZoomRef.current;
    const max = hwRange ? Math.min(hwRange.max, 8) : 3;
    const clamped = Math.max(1, Math.min(max, value));
    zoomRef.current = clamped;
    setZoom(clamped);

    const label = `${Math.round(clamped * 10) / 10}×`;
    setZoomLabel(label);
    if (zoomLabelTimerRef.current) clearTimeout(zoomLabelTimerRef.current);
    zoomLabelTimerRef.current = setTimeout(() => setZoomLabel(null), 1500);

    const track = streamRef.current?.getVideoTracks()[0];
    if (track && hwRange) {
      track.applyConstraints({
        advanced: [{ zoom: Math.max(hwRange.min, Math.min(hwRange.max, clamped)) } as MediaTrackConstraintSet],
      }).catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.style.transform = clamped > 1 ? `scale(${clamped})` : "";
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReady(false);
    setError(null);
    setZoom(1);
    zoomRef.current = 1;
    hwZoomRef.current = null;
    focusSupportedRef.current = false;
    setMaxZoom(3);
    setTorch(false);
    setTorchSupported(false);
    setZoomLabel(null);
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
      const caps = track.getCapabilities() as MediaTrackCapabilitiesExtended;

      if (caps?.zoom) {
        hwZoomRef.current = { min: caps.zoom.min, max: caps.zoom.max };
        setMaxZoom(Math.min(caps.zoom.max, 8));
      }
      if (caps?.focusMode?.includes("continuous")) {
        focusSupportedRef.current = true;
        track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
      }
      if (caps?.torch) {
        setTorchSupported(true);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("카메라를 열 수 없어요.\n권한을 확인해 주세요.");
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const video = videoRef.current;
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (zoomLabelTimerRef.current) clearTimeout(zoomLabelTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [facingMode, startCamera]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 핀치 줌
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const getDist = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

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
    const onTouchEnd = () => { pinchRef.current = null; };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyZoom]);

  // 4:5 뷰파인더 위치 계산
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const vfW = Math.min(cw, ch * (3 / 4));
      const vfH = vfW * (4 / 3);
      setVfRect({ x: (cw - vfW) / 2, y: (ch - vfH) / 2, w: vfW, h: vfH });
    };
    const obs = new ResizeObserver(update);
    obs.observe(el);
    update();
    return () => obs.disconnect();
  }, []);

  function handleTapFocus(e: React.MouseEvent<HTMLDivElement>) {
    if (!focusSupportedRef.current) return;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    setFocusIndicator({ x: px, y: py, fade: false });
    focusTimerRef.current = setTimeout(() => {
      setFocusIndicator((prev) => prev ? { ...prev, fade: true } : null);
      focusTimerRef.current = setTimeout(() => setFocusIndicator(null), 300);
    }, 900);

    track.applyConstraints({
      advanced: [{
        focusMode: "single-shot",
        pointsOfInterest: [{ x: px / rect.width, y: py / rect.height }],
      } as MediaTrackConstraintSet],
    }).then(() => {
      setTimeout(() => {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
      }, 800);
    }).catch(() => {});
  }

  function toggleTorch() {
    const newVal = !torch;
    setTorch(newVal);
    const track = streamRef.current?.getVideoTracks()[0];
    track?.applyConstraints({ advanced: [{ torch: newVal } as MediaTrackConstraintSet] }).catch(() => {});
  }

  function cycleTimer() {
    setTimerMode((t) => (t === 0 ? 3 : t === 3 ? 10 : 0));
  }

  async function doCapture() {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !ready || !container) return;

    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 150);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    // object-cover 기준으로 비디오가 화면에 렌더링되는 스케일
    const videoScale = Math.max(cw / vw, ch / vh);
    const hiddenX = (vw * videoScale - cw) / 2; // 화면 밖으로 나간 렌더링 픽셀 (좌우)
    const hiddenY = (vh * videoScale - ch) / 2; // 화면 밖으로 나간 렌더링 픽셀 (상하)

    // 4:5 뷰파인더 영역 (컨테이너 좌표)
    const vfW = Math.min(cw, ch * (3 / 4));
    const vfH = vfW * (4 / 3);
    const vfX = (cw - vfW) / 2;
    const vfY = (ch - vfH) / 2;

    // 뷰파인더를 비디오 픽셀 좌표로 변환
    let srcX = (vfX + hiddenX) / videoScale;
    let srcY = (vfY + hiddenY) / videoScale;
    let srcW = vfW / videoScale;
    let srcH = vfH / videoScale;

    // 소프트웨어 줌: 뷰파인더 중심을 기준으로 더 크롭
    const currentZoom = zoomRef.current;
    const isHw = !!hwZoomRef.current;
    if (!isHw && currentZoom > 1) {
      const zW = srcW / currentZoom;
      const zH = srcH / currentZoom;
      srcX += (srcW - zW) / 2;
      srcY += (srcH - zH) / 2;
      srcW = zW;
      srcH = zH;
    }

    const sx = Math.round(srcX);
    const sy = Math.round(srcY);
    const sw = Math.round(srcW);
    const sh = Math.round(srcH);

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

  function handleShutter() {
    if (!ready) return;

    // 카운트다운 중이면 취소
    if (countdown !== null) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      setCountdown(null);
      return;
    }

    if (timerMode === 0) {
      doCapture();
    } else {
      let remaining = timerMode;
      setCountdown(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          doCapture();
        }
      }, 1000);
    }
  }

  function handleCancel() {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    onCancel();
  }

  const zoomLevels = [1, 2, ...(maxZoom >= 3 ? [3] : [])];
  const isCountingDown = countdown !== null;

  return (
    <div className="fixed inset-0 z-modal bg-black flex flex-col">
      {/* 상단 바 */}
      <div
        className="flex items-center justify-between px-4 shrink-0 bg-black"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 12 }}
      >
        <button onClick={handleCancel} className="w-11 h-11 flex items-center justify-center text-white/80">
          <X size={24} />
        </button>

        <div className="flex items-center">
          {/* 격자 */}
          <button
            onClick={() => setGrid((g) => !g)}
            className={`w-11 h-11 flex items-center justify-center transition-colors ${grid ? "text-yellow-400" : "text-white/60"}`}
          >
            <Grid3x3 size={20} />
          </button>
          {/* 타이머 */}
          <button
            onClick={cycleTimer}
            className={`w-11 h-11 flex items-center justify-center transition-colors ${timerMode > 0 ? "text-yellow-400" : "text-white/60"}`}
          >
            {timerMode > 0 ? (
              <span className="text-xs font-bold">{timerMode}s</span>
            ) : (
              <Timer size={20} />
            )}
          </button>
          {/* 플래시 (후면 카메라 + 지원 기기만) */}
          {torchSupported && facingMode === "environment" && (
            <button
              onClick={toggleTorch}
              className={`w-11 h-11 flex items-center justify-center transition-colors ${torch ? "text-yellow-400" : "text-white/60"}`}
            >
              {torch ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          )}
        </div>

        {/* 카메라 전환 */}
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
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          onClick={handleTapFocus}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setReady(true)}
            className="w-full h-full object-cover"
          />

          {/* 4:5 뷰파인더 오버레이 */}
          {vfRect && (
            <div className="absolute inset-0 pointer-events-none">
              {/* 뷰파인더 바깥 어두운 영역 */}
              <div
                style={{
                  position: "absolute",
                  left: vfRect.x,
                  top: vfRect.y,
                  width: vfRect.w,
                  height: vfRect.h,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                  borderRadius: 3,
                }}
              />
              {/* 뷰파인더 테두리 */}
              <div
                style={{
                  position: "absolute",
                  left: vfRect.x,
                  top: vfRect.y,
                  width: vfRect.w,
                  height: vfRect.h,
                  border: "1.5px solid rgba(255,255,255,0.6)",
                  borderRadius: 3,
                }}
              />
              {/* 격자선 (뷰파인더 내부) */}
              {grid && (
                <div
                  style={{
                    position: "absolute",
                    left: vfRect.x,
                    top: vfRect.y,
                    width: vfRect.w,
                    height: vfRect.h,
                  }}
                >
                  <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
                  <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />
                  <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
                  <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
                </div>
              )}
            </div>
          )}

          {/* 줌 레벨 */}
          {zoomLabel && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full pointer-events-none">
              {zoomLabel}
            </div>
          )}

          {/* 탭 초점 표시기 */}
          {focusIndicator && (
            <div
              className="absolute pointer-events-none border-2 border-yellow-400 w-14 h-14 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
              style={{ left: focusIndicator.x, top: focusIndicator.y, opacity: focusIndicator.fade ? 0 : 1 }}
            />
          )}

          {/* 촬영 플래시 */}
          {captureFlash && (
            <div className="absolute inset-0 bg-white pointer-events-none" />
          )}

          {/* 타이머 카운트다운 */}
          {isCountingDown && countdown! > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                className="text-white font-bold"
                style={{ fontSize: 120, textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}
              >
                {countdown}
              </span>
            </div>
          )}
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

        {/* 셔터 (카운트다운 중엔 빨간색 → 누르면 취소) */}
        <button
          onClick={handleShutter}
          disabled={!ready}
          className={`w-[72px] h-[72px] rounded-full border-4 disabled:opacity-30 active:scale-95 transition-all ${
            isCountingDown ? "border-red-400" : "border-white bg-white/20"
          }`}
        >
          <div className={`w-full h-full rounded-full scale-[0.82] transition-colors ${
            isCountingDown ? "bg-red-400" : "bg-white"
          }`} />
        </button>
      </div>
    </div>
  );
}
