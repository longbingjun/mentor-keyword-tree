import { useEffect, useRef, useState } from "react";

const TASKS_VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function GestureInput({ enabled, onClose }) {
  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("正在唤醒手势感应");

  useEffect(() => {
    if (!enabled) return undefined;

    let stream;
    let handLandmarker;
    let frameId = 0;
    let stopped = false;
    let lastVideoTime = -1;
    let wasPinching = false;
    let lastSelectAt = 0;
    const smooth = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.5 };

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        if (stopped) return;

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        const visionModule = await import(/* @vite-ignore */ TASKS_VISION_URL);
        const vision = await visionModule.FilesetResolver.forVisionTasks(WASM_ROOT);
        handLandmarker = await visionModule.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.58,
          minHandPresenceConfidence: 0.58,
          minTrackingConfidence: 0.55
        });

        if (stopped) return;
        setStatus("ready");
        setMessage("移动食指，捏合摘取果实");
        detect();
      } catch (error) {
        if (stopped) return;
        console.error("Gesture mode failed to start", error);
        setStatus("error");
        setMessage("未能开启摄像头，请使用点击体验");
      }
    }

    function detect() {
      if (stopped) return;
      const video = videoRef.current;
      if (video?.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const result = handLandmarker.detectForVideo(video, performance.now());
        const landmarks = result.landmarks?.[0];

        if (landmarks) {
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const targetX = (1 - indexTip.x) * window.innerWidth;
          const targetY = indexTip.y * window.innerHeight;
          smooth.x += (targetX - smooth.x) * 0.34;
          smooth.y += (targetY - smooth.y) * 0.34;

          const pinchDistance = distance(indexTip, thumbTip);
          const isPinching = wasPinching ? pinchDistance < 0.082 : pinchDistance < 0.055;
          const cursor = cursorRef.current;
          if (cursor) {
            cursor.style.opacity = "1";
            cursor.style.transform = `translate3d(${smooth.x}px, ${smooth.y}px, 0) scale(${isPinching ? 0.72 : 1})`;
            cursor.dataset.pinching = String(isPinching);
          }

          window.dispatchEvent(new CustomEvent("mentor:gesturemove", {
            detail: { clientX: smooth.x, clientY: smooth.y }
          }));

          const now = performance.now();
          if (isPinching && !wasPinching && now - lastSelectAt > 650) {
            lastSelectAt = now;
            window.dispatchEvent(new CustomEvent("mentor:gestureselect", {
              detail: { clientX: smooth.x, clientY: smooth.y }
            }));
          }
          wasPinching = isPinching;
          setStatus((current) => current === "searching" ? "ready" : current);
        } else {
          wasPinching = false;
          if (cursorRef.current) cursorRef.current.style.opacity = "0";
          setStatus((current) => current === "ready" ? "searching" : current);
        }
      }
      frameId = requestAnimationFrame(detect);
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      handLandmarker?.close();
      stream?.getTracks().forEach((track) => track.stop());
      window.dispatchEvent(new CustomEvent("mentor:gestureleave"));
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <aside className={`gesture-dock is-${status}`} aria-live="polite">
      <video ref={videoRef} muted playsInline aria-hidden="true" />
      <div className="gesture-status">
        <i aria-hidden="true" />
        <span>{status === "searching" ? "让手掌进入画面" : message}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="关闭手势模式">×</button>
      <div ref={cursorRef} className="gesture-cursor" aria-hidden="true"><span /></div>
    </aside>
  );
}
