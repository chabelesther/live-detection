"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaCamera, FaVideo, FaStop, FaTimes } from "react-icons/fa";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000/ws/stream-video";

const Webcam = dynamic(() => import("react-webcam"), {
  ssr: false,
  loading: () => <p>Chargement de la caméra...</p>,
});

interface WebcamRef {
  getScreenshot: () => string | null;
  stream: MediaStream | null;
}

const WebcamCapture: React.FC = () => {
  const webcamRef = useRef<WebcamRef>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({
    width: 640,
    height: 480,
  });

  // Ajuster les dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const maxWidth = window.innerWidth > 640 ? 640 : window.innerWidth;
      const aspectRatio = 4 / 3;
      const height = maxWidth / aspectRatio;
      setDimensions({ width: maxWidth, height });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Animer les frames reçues
  useEffect(() => {
    if (frames.length === 0) return;
    const animate = () => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [frames]);

  // Nettoyage du WebSocket
  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  // Initialiser WebSocket pour le streaming
  const startStreaming = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.stream) return;

    const websocket = new WebSocket(WS_URL);
    setWs(websocket);

    websocket.onopen = () => {
      console.log("WebSocket connecté");
      // Démarrer l'enregistrement pour envoyer des chunks
      const stream = webcamRef.current!.stream!;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 2500000, // Réduire pour faible latence
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && websocket.readyState === WebSocket.OPEN) {
          websocket.send(event.data); // Envoyer le chunk au backend
        }
      };

      mediaRecorderRef.current.start(100); // Générer des chunks toutes les 100ms
      setIsRecording(true);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setError(data.error);
        websocket.close();
      } else if (data.frame) {
        setFrames((prev) =>
          [...prev, `data:image/png;base64,${data.frame}`].slice(-30)
        ); // Garder les 30 dernières frames
      }
    };

    websocket.onerror = () => {
      setError("Erreur WebSocket");
      websocket.close();
    };

    websocket.onclose = () => {
      setIsRecording(false);
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      console.log("WebSocket fermé");
    };
  }, []);

  // Arrêter le streaming
  const stopStreaming = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (ws) {
      ws.close();
    }
  }, [ws]);

  return (
    <div className="relative h-screen w-full bg-black flex flex-col items-center overflow-hidden">
      <div className="relative w-full h-full flex justify-center items-center">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={dimensions.width}
          height={dimensions.height}
          videoConstraints={{
            facingMode: "environment",
            width: dimensions.width,
            height: dimensions.height,
            aspectRatio: 4 / 3,
          }}
          className="object-contain"
          onUserMediaError={(err) =>
            setError("Erreur d'accès à la caméra : " + err)
          }
        />

        {/* Afficher les frames annotées */}
        {frames.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center">
            <img
              src={frames[currentFrameIndex]}
              alt="Frame annotée"
              className="object-contain max-w-full max-h-full"
            />
          </div>
        )}

        {/* Contrôles */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 z-10">
          {!isRecording ? (
            <button
              onClick={startStreaming}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg"
            >
              <FaVideo size={24} />
            </button>
          ) : (
            <button
              onClick={stopStreaming}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg animate-pulse"
            >
              <FaStop size={24} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute top-4 left-0 right-0 mx-auto max-w-xs bg-red-500 text-white px-4 py-2 rounded-lg text-center shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
