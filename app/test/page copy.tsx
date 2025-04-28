"use client";

import { useState } from "react";

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [predictedImage, setPredictedImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePredict = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile); // ATTENTION : ici le champ doit être "file" !

    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("Erreur pendant la prédiction");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setPredictedImage(url);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6">
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button
        onClick={handlePredict}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg"
      >
        Prédire la dégradation
      </button>

      {predictedImage && (
        <div className="mt-6">
          <h2>Résultat :</h2>
          <img
            src={predictedImage}
            alt="Résultat de prédiction"
            className="mt-4"
          />
        </div>
      )}
    </div>
  );
}
