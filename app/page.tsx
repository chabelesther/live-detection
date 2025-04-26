"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // arrière caméra sur mobile
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreaming(true);
        }
      } catch (err) {
        console.error("Erreur accès caméra:", err);
      }
    }

    setupCamera();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!streaming) return;

    const ctx = canvasRef.current?.getContext("2d");

    const simulateDetection = () => {
      if (!ctx || !canvasRef.current || !videoRef.current) return;

      // Nettoyage du canvas
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      // Dessiner des boxes simulées
      const boxes = [
        { x: 100, y: 150, width: 120, height: 80, label: "Nid de poule" },
        { x: 250, y: 300, width: 140, height: 100, label: "Fissure" },
      ];

      boxes.forEach((box) => {
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        ctx.font = "16px Arial";
        ctx.fillStyle = "orange";
        ctx.fillText(box.label, box.x, box.y - 10);
      });
    };

    const interval = setInterval(simulateDetection, 2000); // Simule toutes les 2 secondes

    return () => clearInterval(interval);
  }, [streaming]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        muted
        playsInline
      />
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
