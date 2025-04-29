"use client";
import React, { useState, useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function FileUpload() {
  const [frames, setFrames] = useState<string[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const animationRef = useRef<number | null>(null);

  // Nettoyage du WebSocket et de l'animation
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ws]);

  // Animer les frames
  useEffect(() => {
    if (frames.length === 0 || isVideo) return;

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
  }, [frames, isVideo]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Type de fichier envoyé:", file.type); // Log pour déboguer

    const contentType = file.type;
    if (
      !contentType.startsWith("image/") &&
      !contentType.startsWith("video/")
    ) {
      setError("Type de fichier non pris en charge");
      return;
    }

    setLoading(true);
    setError(null);
    setFrames([]);
    setCurrentFrameIndex(0);
    setIsVideo(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || `Erreur HTTP: ${response.statusText}`
        );
      }

      // Vérifier le type de contenu de la réponse
      const contentTypeResponse = response.headers.get("Content-Type") || "";
      console.log("Type de réponse:", contentTypeResponse);

      if (contentTypeResponse.startsWith("image/")) {
        // Cas d'une image
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setFrames([url]);
        setLoading(false);
      } else if (contentTypeResponse.startsWith("video/")) {
        // Cas d'une vidéo
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        console.log("Vidéo traitée avec succès");

        // Marquer comme vidéo pour l'affichage
        setIsVideo(true);
        setFrames([url]);
        setLoading(false);
      } else if (contentTypeResponse.startsWith("application/json")) {
        // Cas d'une vidéo (réponse JSON indiquant d'utiliser WebSocket)
        const data = await response.json();
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
              setLoading(false);
              websocket.close();
            } else if (data.message === "Traitement terminé") {
              setLoading(false);
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
            setLoading(false);
            console.error("WebSocket error:", e);
          };

          websocket.onclose = () => {
            setLoading(false);
            console.log("WebSocket fermé");
          };
        };

        reader.onerror = () => {
          setError("Erreur lors de la lecture du fichier vidéo");
          setLoading(false);
        };

        reader.readAsArrayBuffer(file);
      } else {
        throw new Error(`Type de réponse inattendu: ${contentTypeResponse}`);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
      console.error("Erreur:", err);
    }
  };

  return (
    <div className="space-y-4">
      <input type="file" accept="image/*,video/*" onChange={handleFileUpload} />

      {loading && <p>Chargement en cours...</p>}
      {error && <p className="text-red-500">Erreur: {error}</p>}

      <div id="results-container">
        {frames.length > 0 && !isVideo && (
          <div>
            <p>
              Frame #{currentFrameIndex + 1} / {frames.length}
            </p>
            <img
              src={frames[currentFrameIndex]}
              alt="Frame annotée"
              style={{ maxWidth: "100%" }}
              onError={(e) => console.error("Image error:", e)}
            />
          </div>
        )}

        {frames.length > 0 && isVideo && (
          <div>
            <p>Vidéo traitée:</p>
            <video
              src={frames[0]}
              controls
              style={{ maxWidth: "100%" }}
              className="w-full h-auto"
              autoPlay={false}
              playsInline
              preload="auto"
              type="video/mp4"
              onError={(e) => {
                console.error("Erreur vidéo:", e);
                setError(
                  "Erreur lors de la lecture de la vidéo. Téléchargez-la pour la visualiser."
                );
                // Ajouter un lien de téléchargement comme solution de secours
                const downloadLink = document.createElement("a");
                downloadLink.href = frames[0];
                downloadLink.download = "video_annotee.mp4";
                downloadLink.innerText = "Télécharger la vidéo";
                downloadLink.className = "text-blue-500 underline mt-2 block";
                const container = document.getElementById("results-container");
                container?.appendChild(downloadLink);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
