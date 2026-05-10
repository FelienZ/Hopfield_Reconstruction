"use client";

import React, { useState } from "react";
import { FingerprintUpload } from "@/components/FingerprintUpload";
import { ResultDisplay } from "@/components/ResultDisplay";
import { identifyFingerprint, IdentifyResponse } from "@/lib/api";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await identifyFingerprint(selectedFile);
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Failed to process fingerprint.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="w-full py-8 px-6 border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">MC-HNN Vision</h1>
            <p className="text-sm text-muted-foreground mt-1">Multi-Connection Hopfield Neural Network</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12 flex flex-col items-center gap-12">
        
        {/* Intro Section */}
        <section className="text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Fingerprint Reconstruction
          </h2>
          <p className="text-muted-foreground text-lg">
            Upload a noisy fingerprint image. Our MC-HNN algorithm will stabilize the pattern and reconstruct the original identity through Lyapunov energy convergence.
          </p>
        </section>

        {/* Upload Component */}
        <FingerprintUpload 
          onFileSelect={handleFileSelect} 
          isLoading={isLoading} 
        />

        {/* Error State */}
        {error && (
          <div className="w-full max-w-md flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Magic Result View */}
        <div className="w-full mt-8">
          <ResultDisplay 
            originalFile={file} 
            result={result} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </main>
  );
}
