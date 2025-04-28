"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaCamera, FaVideo, FaStop, FaUpload, FaTimes } from "react-icons/fa";

// Charger react-webcam uniquement côté client (pas de SSR)
const Webcam = dynamic(() => import("react-webcam"), { ssr: false });

const WebcamCapture: React.FC = () => {
  const webcamRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [frames, setFrames] = useState<string[]>([]); // Pour stocker les frames annotées
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);

  // Dimensions fixes pour la webcam (pour éviter le zoom)
  const [dimensions, setDimensions] = useState({
    width: 640,
    height: 480,
  });

  // Ajuster les dimensions en fonction de l'appareil
  useEffect(() => {
    const updateDimensions = () => {
      const maxWidth = window.innerWidth > 640 ? 640 : window.innerWidth;
      const aspectRatio = 4 / 3; // Ratio standard pour webcam
      const height = maxWidth / aspectRatio;
      setDimensions({
        width: maxWidth,
        height: height,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Animer les frames pour les vidéos
  useEffect(() => {
    if (frames.length === 0) return;

    const animate = () => {
      setCurrentFrameIndex((prev) => {
        const next = (prev + 1) % frames.length;
        animationRef.current = requestAnimationFrame(animate);
        return next;
      });
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [frames]);

  // Nettoyage du WebSocket
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  // Fonction pour capturer une photo
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImgSrc(imageSrc);
        setShowCapture(true);
        setError(null);
        setFrames([]); // Réinitialiser les frames
      } else {
        setError("Erreur lors de la capture de l'image.");
      }
    }
  }, []);

  // Fonction pour démarrer l'enregistrement vidéo
  const startRecording = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.stream) return;

    setRecordedChunks([]);
    const stream = webcamRef.current.stream;
    const options = { mimeType: "video/webm;codecs=vp9" };
    mediaRecorderRef.current = new MediaRecorder(stream, options);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      setIsRecording(false);
      setShowCapture(true);
      setFrames([]); // Réinitialiser les frames
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  }, []);

  // Fonction pour arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Fonction pour envoyer l'image ou la vidéo au backend
  const uploadToBackend = async () => {
    if (imgSrc) {
      // Cas d'une image
      try {
        const response = await fetch(imgSrc);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("file", blob, "captured-image.jpg");

        const res = await fetch(
          "https://chester24-yolo-detection-api.hf.space/predict",
          {
            method: "POST",
            body: formData,
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || `Erreur HTTP: ${res.statusText}`);
        }

        const contentTypeResponse = res.headers.get("Content-Type") || "";
        if (contentTypeResponse.startsWith("image/")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          setFrames([url]); // Afficher l'image annotée
          setError(null);
        } else {
          throw new Error(`Type de réponse inattendu: ${contentTypeResponse}`);
        }
      } catch (err: any) {
        setError("Erreur lors de l'envoi de l'image: " + err.message);
        console.error("Erreur:", err);
      }
    } else if (recordedChunks.length > 0) {
      // Cas d'une vidéo
      try {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const formData = new FormData();
        formData.append("file", blob, "recorded-video.webm");

        const res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || `Erreur HTTP: ${res.statusText}`);
        }

        const contentTypeResponse = res.headers.get("Content-Type") || "";
        if (contentTypeResponse.startsWith("application/json")) {
          const data = await res.json();
          console.log("Réponse JSON:", data);

          const reader = new FileReader();
          reader.onload = async (event) => {
            if (!event.target?.result) {
              throw new Error("Impossible de lire le fichier vidéo");
            }

            const videoData = event.target.result as ArrayBuffer;

            const websocket = new WebSocket(
              "ws://127.0.0.1:8000/ws/process-video"
            );
            setWs(websocket);

            websocket.onopen = () => {
              websocket.send(videoData);
            };

            websocket.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.error) {
                setError(data.error);
                websocket.close();
              } else if (data.message === "Traitement terminé") {
                websocket.close();
              } else {
                setFrames((prev) => [
                  ...prev,
                  `data:image/png;base64,${data.frame}`,
                ]);
              }
            };

            websocket.onerror = (e) => {
              setError("Erreur WebSocket");
              console.error("WebSocket error:", e);
            };

            websocket.onclose = () => {
              console.log("WebSocket fermé");
            };
          };

          reader.onerror = () => {
            setError("Erreur lors de la lecture du fichier vidéo");
          };

          reader.readAsArrayBuffer(blob);
        } else {
          throw new Error(`Type de réponse inattendu: ${contentTypeResponse}`);
        }
      } catch (err: any) {
        setError("Erreur lors de l'envoi de la vidéo: " + err.message);
        console.error("Erreur:", err);
      }
    }
  };

  const closeCapture = () => {
    setShowCapture(false);
    setImgSrc(null);
    setRecordedChunks([]);
    setFrames([]);
    setCurrentFrameIndex(0);
  };

  return (
    <div className="relative h-screen w-full bg-black flex flex-col items-center overflow-hidden">
      {!showCapture ? (
        <>
          {/* Interface principale de caméra */}
          <div className="relative w-full h-full flex justify-center items-center">
            <Webcam
              audio={true} // Activer l'audio pour l'enregistrement vidéo
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={dimensions.width}
              height={dimensions.height}
              videoConstraints={{
                facingMode: "environment", // Caméra arrière sur mobile
                width: dimensions.width,
                height: dimensions.height,
                aspectRatio: 4 / 3, // Forcer le ratio 4:3
              }}
              className="object-contain" // Éviter le zoom
              onUserMediaError={(err) =>
                setError("Erreur d'accès à la caméra : " + err)
              }
            />

            {/* Contrôles de la caméra */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 z-10">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg"
                >
                  <FaVideo size={24} />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg animate-pulse"
                >
                  <FaStop size={24} />
                </button>
              )}

              <button
                onClick={capture}
                className="w-20 h-20 rounded-full border-4 border-white bg-white bg-opacity-20 flex items-center justify-center shadow-lg"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                  <FaCamera size={28} className="text-gray-800" />
                </div>
              </button>
            </div>

            {/* Mini carte en bas à droite */}
            <div className="absolute bottom-5 right-5 w-16 h-16 bg-white rounded-md shadow-lg overflow-hidden">
              <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-blue-500">
                  <path
                    fill="currentColor"
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Affichage de la capture ou des résultats annotés */}
          <div className="relative w-full h-full bg-black flex justify-center items-center">
            {frames.length === 0 ? (
              // Afficher la capture originale (avant envoi au backend)
              <>
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt="Capture"
                    className="object-contain max-w-full max-h-full"
                  />
                )}
                {recordedChunks.length > 0 && (
                  <video
                    controls
                    className="object-contain max-w-full max-h-full"
                    src={URL.createObjectURL(
                      new Blob(recordedChunks, { type: "video/webm" })
                    )}
                    autoPlay
                  />
                )}
              </>
            ) : (
              // Afficher les résultats annotés
              <div className="w-full h-full flex justify-center items-center">
                <img
                  src={frames[currentFrameIndex]}
                  alt="Frame annotée"
                  className="object-contain max-w-full max-h-full"
                />
                {frames.length > 1 && (
                  <p className="absolute top-4 left-4 text-white">
                    Frame #{currentFrameIndex + 1} / {frames.length}
                  </p>
                )}
              </div>
            )}

            {/* Boutons d'action */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 z-10">
              <button
                onClick={closeCapture}
                className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
              >
                <FaTimes size={24} />
              </button>

              {(imgSrc || recordedChunks.length > 0) && frames.length === 0 && (
                <button
                  onClick={uploadToBackend}
                  className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"
                >
                  <FaUpload size={24} />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Afficher les erreurs */}
      {error && (
        <div className="absolute top-4 left-0 right-0 mx-auto max-w-xs bg-red-500 text-white px-4 py-2 rounded-lg text-center shadow-lg z-50">
          {error}
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
