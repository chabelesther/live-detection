"use client";
import React, { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// Charger react-webcam uniquement côté client (pas de SSR)
const Webcam = dynamic(() => import("react-webcam"), { ssr: false });

const WebcamCapture: React.FC = () => {
  const webcamRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour capturer une photo
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImgSrc(imageSrc);
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

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Afficher le flux vidéo de la webcam */}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={640}
        height={480}
        videoConstraints={{
          facingMode: "environment", // Caméra arrière sur mobile
        }}
        onUserMediaError={(err) =>
          setError("Erreur d'accès à la caméra : " + err)
        }
      />

      {/* Boutons pour la capture de photo */}
      <button
        onClick={capture}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Prendre une photo
      </button>

      {/* Boutons pour l'enregistrement vidéo */}
      <div className="flex space-x-2">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className={`px-4 py-2 rounded ${
            isRecording ? "bg-gray-400" : "bg-red-500 text-white"
          }`}
        >
          Démarrer l'enregistrement
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className={`px-4 py-2 rounded ${
            !isRecording ? "bg-gray-400" : "bg-red-500 text-white"
          }`}
        >
          Arrêter l'enregistrement
        </button>
      </div>

      {/* Afficher l'image capturée */}
      {imgSrc && (
        <div>
          <img src={imgSrc} alt="Photo capturée" className="mt-4" />
          <button
            onClick={uploadImageToBackend}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
          >
            Envoyer l'image au backend
          </button>
        </div>
      )}

      {/* Afficher et envoyer la vidéo enregistrée */}
      {recordedChunks.length > 0 && !isRecording && (
        <div>
          <video
            controls
            src={URL.createObjectURL(
              new Blob(recordedChunks, { type: "video/webm" })
            )}
            className="mt-4"
          />
          <button
            onClick={uploadVideoToBackend}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
          >
            Envoyer la vidéo au backend
          </button>
        </div>
      )}

      {/* Afficher les erreurs */}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default WebcamCapture;
