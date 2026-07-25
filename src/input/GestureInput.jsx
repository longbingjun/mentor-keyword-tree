import { useEffect, useRef, useState } from "react";

const TASKS_VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("gesture-model-timeout")), timeoutMs);
    })
  ]);
}

export function GestureInput({ enabled, reading, onClose }) {
  const videoRef = useRef(null);
  const cursorRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("正在唤醒手势感应");
  const [targetIndex, setTargetIndex] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;

    setStatus("loading");
    setMessage("正在唤醒手势感应");
    setTargetIndex(null);

    let stream;
    let handLandmarker;
    let frameId = 0;
    let stopped = false;
    let cameraReady = false;
    let lastVideoTime = -1;
    let wasPinching = false;
    let lastSelectAt = 0;
    let feedbackTimer = 0;
    const smooth = { x: window.innerWidth * 0.72, y: window.innerHeight * 0.5 };

    function onGestureTarget(event) {
      const nextTarget = event.detail.index;
      setTargetIndex(nextTarget);
      if (cursorRef.current) cursorRef.current.dataset.target = String(nextTarget !== null);
    }

    function onGesturePicked() {
      setStatus("picked");
      setMessage("摘取成功，果实正在点亮");
      window.clearTimeout(feedbackTimer);
      feedbackTimer = window.setTimeout(() => {
        if (!stopped) setStatus("ready");
      }, 1100);
    }

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
        cameraReady = true;

        const visionModule = await withTimeout(import(/* @vite-ignore */ TASKS_VISION_URL), 15000);
        const vision = await withTimeout(visionModule.FilesetResolver.forVisionTasks(WASM_ROOT), 15000);
        handLandmarker = await withTimeout(visionModule.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.58,
          minHandPresenceConfidence: 0.58,
          minTrackingConfidence: 0.55
        }), 20000);

        if (stopped) return;
        setStatus("ready");
        setMessage("移动食指，捏合摘取果实");
        detect();
      } catch (error) {
        if (stopped) return;
        console.error("Gesture mode failed to start", error);
        setStatus("error");
        setMessage(cameraReady ? "手势模型加载失败，请检查网络后重试" : "未能开启摄像头，请检查浏览器权限");
      }
    }

    function detect() {
      if (stopped) return;
      const video = videoRef.current;
      if (video?.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        let result;
        try {
          result = handLandmarker.detectForVideo(video, performance.now());
        } catch (error) {
          console.error("Gesture detection failed", error);
          setStatus("error");
          setMessage("手势识别运行失败，请关闭后重试");
          return;
        }
        const landmarks = result.landmarks?.[0];

        if (landmarks) {
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const targetX = (1 - indexTip.x) * window.innerWidth;
          const targetY = indexTip.y * window.innerHeight;
          smooth.x += (targetX - smooth.x) * 0.34;
          smooth.y += (targetY - smooth.y) * 0.34;

          const palmWidth = Math.max(distance(landmarks[5], landmarks[17]), 0.001);
          const pinchRatio = distance(indexTip, thumbTip) / palmWidth;
          // Palm-relative thresholds work across different camera distances. The
          // wider entry threshold keeps an ordinary thumb-index pinch reliable.
          const isPinching = wasPinching ? pinchRatio < 0.84 : pinchRatio < 0.66;
          const cursor = cursorRef.current;
          if (cursor) {
            cursor.style.opacity = "1";
            cursor.style.transform = `translate3d(${smooth.x}px, ${smooth.y}px, 0) scale(${isPinching ? 0.72 : 1})`;
            cursor.dataset.pinching = String(isPinching);
          }

          window.dispatchEvent(new CustomEvent("mentor:gesturemove", {
            detail: { clientX: smooth.x, clientY: smooth.y, pinchRatio }
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

    window.addEventListener("mentor:gesturetarget", onGestureTarget);
    window.addEventListener("mentor:gesturepicked", onGesturePicked);
    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(feedbackTimer);
      window.removeEventListener("mentor:gesturetarget", onGestureTarget);
      window.removeEventListener("mentor:gesturepicked", onGesturePicked);
      handLandmarker?.close();
      stream?.getTracks().forEach((track) => track.stop());
      window.dispatchEvent(new CustomEvent("mentor:gestureleave"));
    };
  }, [enabled]);

  if (!enabled) return null;

  const statusMessage = status === "searching"
    ? "已启动摄像头，请让手掌进入画面"
    : status === "ready" && reading
      ? "阅读完成后，再次捏合归入树冠"
    : status === "ready" && targetIndex !== null
      ? "已对准果实，捏合拇指与食指"
      : status === "ready"
        ? "移动食指，对准正在发光的果实"
        : message;

  return (
    <aside className={`gesture-dock is-${status}`} aria-live="polite">
      <video ref={videoRef} muted playsInline aria-hidden="true" />
      <div className="gesture-status">
        <i aria-hidden="true" />
        <span>{statusMessage}</span>
      </div>
      <button type="button" onClick={onClose} aria-label="关闭手势模式">×</button>
      <div ref={cursorRef} className="gesture-cursor" aria-hidden="true"><span /></div>
    </aside>
  );
}
