"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { CheckCircle2, XCircle, Fingerprint, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { IdentifyResponse } from "@/lib/api";
// @ts-ignore
import UTIF from "utif";

interface ResultDisplayProps {
  originalFile: File | null;
  result: IdentifyResponse | null;
  isLoading: boolean;
}

export function ResultDisplay({ originalFile, result, isLoading }: ResultDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanLineRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (!originalFile) {
      setPreviewUrl(null);
      return;
    }

    const isTiff = originalFile.name.toLowerCase().endsWith('.tif') || originalFile.name.toLowerCase().endsWith('.tiff');

    if (isTiff) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const ifds = UTIF.decode(buffer);
          UTIF.decodeImage(buffer, ifds[0]);
          const rgba = UTIF.toRGBA8(ifds[0]);
          
          const canvas = document.createElement('canvas');
          canvas.width = ifds[0].width;
          canvas.height = ifds[0].height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            imageData.data.set(new Uint8ClampedArray(rgba));
            ctx.putImageData(imageData, 0, 0);
            setPreviewUrl(canvas.toDataURL('image/png'));
          }
        } catch (err) {
          console.error("Failed to parse TIFF", err);
        }
      };
      reader.readAsArrayBuffer(originalFile);
    } else {
      const url = URL.createObjectURL(originalFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [originalFile]);

  // GSAP Scanning Line Animation
  useEffect(() => {
    let scanTween: gsap.core.Tween;
    
    if (isLoading && scanLineRef.current) {
      gsap.set(scanLineRef.current, { opacity: 1, top: "0%" });
      scanTween = gsap.to(scanLineRef.current, {
        top: "100%",
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "linear",
      });
    } else if (scanLineRef.current) {
      gsap.to(scanLineRef.current, { opacity: 0, duration: 0.3 });
    }

    return () => {
      if (scanTween) scanTween.kill();
    };
  }, [isLoading]);

  // GSAP Fade in results
  useEffect(() => {
    if (result && !isLoading && resultRef.current) {
      gsap.fromTo(
        resultRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [result, isLoading]);

  if (!previewUrl && !isLoading) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8" ref={containerRef}>
      {/* Visual Comparison Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Input Side */}
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Input Noisy</h3>
          <div className="relative w-full max-w-[300px] aspect-square rounded-xl overflow-hidden border border-border bg-black">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={previewUrl} 
                alt="Original Upload" 
                className={`w-full h-full object-contain ${isLoading ? 'opacity-50' : 'opacity-100'}`}
              />
            )}
            
            {/* GSAP Scanning Line */}
            <div 
              ref={scanLineRef}
              className="absolute left-0 w-full h-[2px] bg-primary shadow-[0_0_15px_3px_rgba(255,255,255,0.7)] z-10 opacity-0"
              style={{ top: "0%" }}
            />
          </div>
        </div>

        {/* Output Side */}
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Reconstructed</h3>
          <div className="relative w-full max-w-[300px] aspect-square rounded-xl overflow-hidden border border-border bg-black flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Fingerprint className="w-8 h-8 animate-pulse text-primary/50" />
                <span className="text-sm animate-pulse">Running MC-HNN...</span>
              </div>
            ) : result?.reconstructed_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={result.reconstructed_image} 
                alt="Reconstructed" 
                className="w-full h-full object-contain image-rendering-pixelated"
                style={{ imageRendering: "pixelated" }} // Good for 30x30 output
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Identity Dashboard */}
      {result && !isLoading && (
        <div ref={resultRef} className="w-full pt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-[0_0_30px_-10px_rgba(255,255,255,0.1)]">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Identity & Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className={`p-2 rounded-md ${result.status === "AUTHORIZED" ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                    <Fingerprint className={`w-6 h-6 ${result.status === "AUTHORIZED" ? 'text-emerald-500' : 'text-destructive'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Authentication Status</p>
                    <p className={`text-2xl font-bold font-mono tracking-tight ${result.status === "AUTHORIZED" ? 'text-emerald-500' : 'text-destructive'}`}>
                      {result.status === "AUTHORIZED" ? "AUTHORIZED" : "UNAUTHORIZED"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className={`p-2 rounded-md ${result.status === "AUTHORIZED" ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                    {result.status === "AUTHORIZED" ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <XCircle className="w-6 h-6 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Network Convergence</p>
                    <p className={`text-xl font-semibold tracking-tight ${result.status === "AUTHORIZED" ? 'text-emerald-500' : 'text-destructive'}`}>
                      {result.status === "AUTHORIZED" ? "Stable State" : "Unstable / Low Affinity"}
                    </p>
                    {result.status === "AUTHORIZED" ? (
                      <p className="text-xs text-muted-foreground mt-1">Algorithm 3 Lyapunov Energy Check</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Initial Energy: {result.diagnostics.initial_energy.toFixed(1)}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
