"use client";

import { motion } from "framer-motion";
import { type Theme } from "@/lib/themes";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import FloatingPhotos from "./FloatingPhotos";

interface MessageRevealProps {
  title: string;
  message: string;
  theme: Theme;
  onComplete: () => void;
  photos?: { url: string; caption?: string; rotation_deg?: number }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 } as const,
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 } as const,
  },
};

export default function MessageReveal({
  title,
  message,
  theme,
  onComplete,
  photos = [],
}: MessageRevealProps) {
  const words = message.split(" ");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 py-16 relative overflow-hidden"
      style={{ background: theme.colors.background }}
    >
      <FloatingPhotos photos={photos} screenIndex={100} />

      <div className="relative max-w-xs text-center" style={{ zIndex: 20 }}>
        <motion.h2
          className="font-heading text-2xl mb-8"
          style={{ color: theme.colors.text }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </motion.h2>

        <motion.p
          className="font-heading text-xl leading-relaxed mb-12"
          style={{ color: theme.colors.text }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {words.map((word, i) => (
            <motion.span key={i} variants={wordVariants} className="inline-block mr-1">
              {word}
            </motion.span>
          ))}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: words.length * 0.08 + 0.5 }}
        >
          <Button
            onClick={onComplete}
            className="h-12 px-8 rounded-full text-white font-medium transition-all duration-300 hover:scale-105 shadow-lg"
            style={{ background: theme.colors.accent }}
          >
            Continue
            <ArrowDown className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
