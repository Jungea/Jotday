"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { X, RefreshCw } from "lucide-react";

interface Props {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraModal({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError("카메라를 열 수 없어요.\n권한을 확인해 주세요.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facingMode, startCamera]);

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    try {
      if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(w, h);
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
        onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85);
      }
    } catch {
      setError("사진 촬영에 실패했어요.");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {error ? (
        <div className="flex-1 flex items-center justify-center px-8">
          <p className="text-white text-center whitespace-pre-line">{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => setReady(true)}
          className="flex-1 w-full object-cover"
        />
      )}

      <div
        className="flex items-center justify-between px-10 py-8 bg-black"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={onCancel}
          className="w-12 h-12 flex items-center justify-center text-white/80"
        >
          <X size={26} />
        </button>

        {/* 셔터 */}
        <button
          onClick={handleCapture}
          disabled={!ready}
          className="w-[72px] h-[72px] rounded-full border-4 border-white bg-white/20 disabled:opacity-30 active:scale-95 transition-transform"
        >
          <div className="w-full h-full rounded-full bg-white scale-[0.82]" />
        </button>

        {/* 전후면 전환 */}
        <button
          onClick={() => setFacingMode((f) => f === "environment" ? "user" : "environment")}
          className="w-12 h-12 flex items-center justify-center text-white/80"
        >
          <RefreshCw size={22} />
        </button>
      </div>
    </div>
  );
}
