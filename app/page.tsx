"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaCamera, FaVideo, FaStop, FaUpload, FaTimes } from "react-icons/fa";

// Charger react-webcam uniquement côté client (pas de SSR)
const Webcam = dynamic(() => import("react-webcam"), { ssr: false });

const WebcamCapture: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webcamRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: 640,
    height: 480,
  });

  // Mettre à jour les dimensions de la fenêtre pour la caméra
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Fonction pour capturer une photo
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImgSrc(imageSrc);
        setShowCapture(true);
        setError(null);
      } else {
        setError("Erreur lors de la capture de l'image.");
      }
    }
  }, []);

  // Fonction pour envoyer l'image au backend
  const uploadImageToBackend = async () => {
    if (!imgSrc) return;

    try {
      const response = await fetch(imgSrc);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append("image", blob, "captured-image.jpg");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Réponse du backend (image) :", data);
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'image :", err);
      setError("Erreur lors de l'envoi de l'image.");
    }
  };

  // Fonction pour démarrer l'enregistrement vidéo
  const startRecording = useCallback(() => {
    if (!webcamRef.current || !webcamRef.current.stream) return;

    setRecordedChunks([]); // Réinitialiser les chunks
    const stream = webcamRef.current.stream;
    const options = { mimeType: "video/webm;codecs=vp9" }; // Format vidéo compatible
    mediaRecorderRef.current = new MediaRecorder(stream, options);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      setIsRecording(false);
      setShowCapture(true);
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

  // Fonction pour envoyer la vidéo au backend
  const uploadVideoToBackend = async () => {
    if (recordedChunks.length === 0) return;

    try {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "recorded-video.webm");

      const res = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("Réponse du backend (vidéo) :", data);
    } catch (err) {
      console.error("Erreur lors de l'envoi de la vidéo :", err);
      setError("Erreur lors de l'envoi de la vidéo.");
    }
  };

  const closeCapture = () => {
    setShowCapture(false);
    setImgSrc(null);
    setRecordedChunks([]);
  };

  return (
    <div className="relative h-screen w-full bg-black flex flex-col items-center overflow-hidden">
      {!showCapture ? (
        <>
          {/* Interface principale de caméra */}
          <div className="relative w-full h-full">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={windowDimensions.width}
              height={windowDimensions.height}
              videoConstraints={{
                facingMode: "environment", // Caméra arrière sur mobile
                width: windowDimensions.width,
                height: windowDimensions.height,
              }}
              className="h-full w-full object-cover"
              onUserMediaError={(err) =>
                setError("Erreur d&apos;accès à la caméra : " + err)
              }
            />

            {/* Zone d'analyse visuelle (simulation basée sur l'image partagée) */}
            {/* <div className="absolute inset-0 pointer-events-none"> */}
            {/* Ligne horizontale et verticale de guidage */}
            {/* <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-500 bg-opacity-50"></div>
              <div className="absolute left-1/2 top-0 h-full w-0.5 bg-green-500 bg-opacity-50"></div> */}

            {/* Zones de détection (simulation) - première zone */}
            {/* <div className="absolute top-[30%] left-[25%] w-[30%] h-[15%] border-2 border-orange-500 rounded-md">
                <div className="absolute -top-6 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-t-md">
                  DÉTECTION 1
                </div>
              </div> */}

            {/* Zones de détection - deuxième zone */}
            {/* <div className="absolute top-[50%] left-[25%] w-[30%] h-[15%] border-2 border-orange-500 rounded-md">
                <div className="absolute -top-6 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-t-md">
                  DÉTECTION 2
                </div>
              </div> */}

            {/* Zone verte à droite */}
            {/* <div className="absolute top-[30%] right-[10%] w-[15%] h-[50%] border-2 border-green-500 rounded-md">
                <div className="absolute -top-6 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-t-md">
                  ZONE OK
                </div>
              </div>
            </div> */}

            {/* Contrôles de la caméra */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8 z-10">
              {/* Bouton d'enregistrement vidéo */}
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

              {/* Bouton de capture photo principal */}
              <button
                onClick={capture}
                className="w-20 h-20 rounded-full border-4 border-white bg-white bg-opacity-20 flex items-center justify-center shadow-lg"
              >
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                  <FaCamera size={28} className="text-gray-800" />
                </div>
              </button>
            </div>

            {/* Mini carte en bas à droite (comme dans l'image) */}
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
          {/* Affichage de la capture */}
          <div className="relative w-full h-full bg-black">
            {/* Image capturée */}
            {imgSrc && (
              <div className="w-full h-full">
                <img
                  src={imgSrc}
                  alt="Capture"
                  className="w-full h-full object-contain"
                />

                {/* Annotations de l'image (simulation) */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Première zone de détection */}
                  {/* <div className="absolute top-[30%] left-[25%] w-[30%] h-[15%] border-2 border-orange-500 rounded-md">
                    <div className="absolute -top-6 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-t-md">
                      DÉTECTION 1
                    </div>
                  </div> */}

                  {/* Deuxième zone de détection */}
                  {/* <div className="absolute top-[50%] left-[25%] w-[30%] h-[15%] border-2 border-orange-500 rounded-md">
                    <div className="absolute -top-6 left-0 bg-orange-500 text-white text-xs px-2 py-1 rounded-t-md">
                      DÉTECTION 2
                    </div>
                  </div> */}

                  {/* Zone verte à droite */}
                  {/* <div className="absolute top-[30%] right-[10%] w-[15%] h-[50%] border-2 border-green-500 rounded-md">
                    <div className="absolute -top-6 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-t-md">
                      ZONE OK
                    </div>
                  </div> */}
                </div>
              </div>
            )}

            {/* Vidéo enregistrée */}
            {recordedChunks.length > 0 && (
              <div className="w-full h-full">
                <video
                  controls
                  className="w-full h-full object-contain"
                  src={URL.createObjectURL(
                    new Blob(recordedChunks, { type: "video/webm" })
                  )}
                  autoPlay
                />
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

              <button
                onClick={imgSrc ? uploadImageToBackend : uploadVideoToBackend}
                className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"
              >
                <FaUpload size={24} />
              </button>
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
