"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import celebrationData from "../../../public/animations/celebration.json";
import { playSound } from "@/lib/sounds";

interface CelebrationOverlayProps {
  onComplete?: () => void;
  duration?: number;
}

export default function CelebrationOverlay({ onComplete, duration = 2000 }: CelebrationOverlayProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    playSound("celebrate");
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <Lottie
        animationData={celebrationData}
        loop={false}
        autoplay
        className="w-80 h-80 sm:w-96 sm:h-96"
      />
    </div>
  );
}
