/**
 * Shared JSX renderer for designer-art OG cards.
 * Returns a root JSX element — callers wrap it in ImageResponse.
 *
 * Satori constraints:
 * - Comma-joined backgroundImage strings for layered gradients.
 * - No backdrop-filter / blur — use radial gradient "glow" divs for depth.
 * - boxShadow, borderRadius, border, opacity, letterSpacing, absolute positioning all OK.
 * - backgroundClip:"text" + color:"transparent" for gradient text.
 */

import type { DesignerTemplate, StyleVariant } from "./designer-art";

export type VisualMode = "editorial" | "quiet" | "modern";

export function styleToMode(style: StyleVariant): VisualMode {
  if (style === "bold") return "modern";
  if (style === "minimal") return "quiet";
  return "editorial";
}

export interface BuildDesignerCardOptions {
  template: DesignerTemplate;
  title: string;
  occasionLabel: string; // eyebrow text, already uppercase
  width: number;
  height: number;
  style: StyleVariant;
}

export function buildDesignerCard({
  template: t,
  title,
  occasionLabel,
  width,
  height,
  style,
}: BuildDesignerCardOptions): React.ReactElement {
  const mode = styleToMode(style);
  const isPortrait = height > width;

  if (mode === "modern") {
    return buildModernCard({ t, title, occasionLabel, width, height, isPortrait });
  }
  return buildEditorialCard({ t, title, occasionLabel, width, height, mode, isPortrait });
}

/* ─── Editorial (classic) & Quiet (minimal) ──────────────────────────────── */

interface EditorialProps {
  t: DesignerTemplate;
  title: string;
  occasionLabel: string;
  width: number;
  height: number;
  mode: "editorial" | "quiet";
  isPortrait: boolean;
}

function buildEditorialCard({
  t,
  title,
  occasionLabel,
  width,
  height,
  mode,
  isPortrait,
}: EditorialProps): React.ReactElement {
  const isQuiet = mode === "quiet";

  // Title font size: scale with canvas height
  const titleSize = isPortrait
    ? Math.round(height * 0.058) // ~111 for 1920h, ~87 for 1500h
    : Math.round(height * 0.065);
  const titleSizeClamped = Math.min(Math.max(titleSize, 72), 128);

  // Framed card inner padding
  const framePad = Math.round(width * 0.06);
  const frameMargin = Math.round(width * 0.05);
  const frameRadius = isPortrait ? 40 : 32;

  // Glow color
  const glowColor = t.glow ?? "rgba(255,255,255,0.18)";

  // For quiet mode, inner card is near-white with soft shadow
  const cardBg = isQuiet ? "rgba(255,252,250,0.88)" : "rgba(255,255,255,0.08)";
  const cardBorder = isQuiet
    ? "1px solid rgba(180,140,130,0.30)"
    : "1px solid rgba(255,255,255,0.45)";
  const cardShadow = isQuiet
    ? "0 8px 48px rgba(0,0,0,0.12)"
    : "0 8px 64px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)";

  const accentColor = t.accent;
  const eyebrowOpacity = 0.85;
  const emojiOpacity = isQuiet ? 0.06 : 0.09;

  // Eyebrow + footer Inter weight
  const interFamily = "Inter, system-ui, sans-serif";
  const fraunceFamily = "Fraunces, Georgia, serif";

  return (
    <div
      style={{
        width,
        height,
        backgroundImage: t.bgDeep ?? t.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radial glow top-center */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(ellipse 80% 55% at 50% 5%, ${glowColor} 0%, transparent 70%)`,
          display: "flex",
        }}
      />

      {/* Vignette bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: Math.round(height * 0.35),
          backgroundImage: "linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 100%)",
          display: "flex",
        }}
      />

      {/* Giant emoji watermark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          fontSize: Math.round(Math.min(width, height) * 0.52),
          opacity: emojiOpacity,
          transform: "translate(-50%, -50%)",
          display: "flex",
          userSelect: "none",
          lineHeight: 1,
        }}
      >
        {t.emoji}
      </div>

      {/* Framed inner card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          margin: frameMargin,
          padding: framePad,
          background: cardBg,
          border: cardBorder,
          borderRadius: frameRadius,
          boxShadow: cardShadow,
          width: width - frameMargin * 2,
          minHeight: Math.round(height * (isPortrait ? 0.55 : 0.60)),
          position: "relative",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: interFamily,
            fontWeight: 700,
            fontSize: isPortrait ? 28 : 26,
            letterSpacing: 10,
            color: isQuiet ? t.accent : accentColor,
            opacity: eyebrowOpacity,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {occasionLabel}
        </div>

        {/* Hairline divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 20,
            marginBottom: 20,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 60,
              height: 1,
              background: isQuiet
                ? `rgba(0,0,0,0.18)`
                : `rgba(255,255,255,0.40)`,
              display: "flex",
            }}
          />
          <div
            style={{
              width: 9,
              height: 9,
              background: isQuiet ? t.accent : accentColor,
              opacity: 0.55,
              transform: "rotate(45deg)",
              display: "flex",
            }}
          />
          <div
            style={{
              width: 60,
              height: 1,
              background: isQuiet
                ? `rgba(0,0,0,0.18)`
                : `rgba(255,255,255,0.40)`,
              display: "flex",
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: fraunceFamily,
            fontWeight: 600,
            fontSize: titleSizeClamped,
            lineHeight: 1.08,
            color: isQuiet ? t.accent : accentColor,
            textAlign: "center",
            padding: `0 ${Math.round(framePad * 0.6)}px`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {title}
        </div>

        {/* Bottom divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 28,
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 1,
              background: isQuiet
                ? `rgba(0,0,0,0.14)`
                : `rgba(255,255,255,0.30)`,
              display: "flex",
            }}
          />
          <div
            style={{
              width: 7,
              height: 7,
              background: isQuiet ? t.accent : accentColor,
              opacity: 0.40,
              transform: "rotate(45deg)",
              display: "flex",
            }}
          />
          <div
            style={{
              width: 40,
              height: 1,
              background: isQuiet
                ? `rgba(0,0,0,0.14)`
                : `rgba(255,255,255,0.30)`,
              display: "flex",
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: interFamily,
          fontWeight: 400,
          fontSize: 26,
          color: isQuiet ? t.accent : accentColor,
          opacity: 0.45,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            background: isQuiet ? t.accent : accentColor,
            transform: "rotate(45deg)",
            display: "flex",
          }}
        />
        <span style={{ display: "flex" }}>made with TaDaaaa</span>
      </div>
    </div>
  );
}

/* ─── Modern (bold) ──────────────────────────────────────────────────────── */

interface ModernProps {
  t: DesignerTemplate;
  title: string;
  occasionLabel: string;
  width: number;
  height: number;
  isPortrait: boolean;
}

function buildModernCard({
  t,
  title,
  occasionLabel,
  width,
  height,
  isPortrait,
}: ModernProps): React.ReactElement {
  const interFamily = "Inter, system-ui, sans-serif";
  const titleSize = isPortrait
    ? Math.round(height * 0.065)
    : Math.round(height * 0.075);
  const titleSizeClamped = Math.min(Math.max(titleSize, 80), 140);
  const pad = Math.round(width * 0.075);

  return (
    <div
      style={{
        width,
        height,
        backgroundImage: t.background,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        position: "relative",
        overflow: "hidden",
        padding: pad,
      }}
    >
      {/* Diagonal accent block top-right */}
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: Math.round(width * 0.55),
          height: Math.round(width * 0.55),
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 60,
          right: -40,
          width: Math.round(width * 0.35),
          height: Math.round(width * 0.35),
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          display: "flex",
        }}
      />

      {/* Big emoji top-left */}
      <div
        style={{
          position: "absolute",
          top: pad,
          left: pad,
          fontSize: Math.round(Math.min(width, height) * 0.22),
          lineHeight: 1,
          display: "flex",
        }}
      >
        {t.emoji}
      </div>

      {/* Bottom content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          zIndex: 2,
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: interFamily,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 6,
            color: t.accent,
            opacity: 0.70,
            textTransform: "uppercase",
            marginBottom: 16,
            display: "flex",
          }}
        >
          {occasionLabel}
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: interFamily,
            fontWeight: 700,
            fontSize: titleSizeClamped,
            lineHeight: 0.95,
            letterSpacing: -3,
            color: t.accent,
            textTransform: "uppercase",
            display: "flex",
            flexWrap: "wrap",
            maxWidth: width - pad * 2,
          }}
        >
          {title}
        </div>

        {/* Accent bar */}
        <div
          style={{
            marginTop: 28,
            width: 80,
            height: 6,
            borderRadius: 3,
            background: t.accent,
            opacity: 0.75,
            display: "flex",
          }}
        />

        {/* Footer chip */}
        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: interFamily,
            fontWeight: 400,
            fontSize: 24,
            color: t.accent,
            opacity: 0.55,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: t.accent,
              transform: "rotate(45deg)",
              display: "flex",
            }}
          />
          <span style={{ display: "flex" }}>made with TaDaaaa</span>
        </div>
      </div>
    </div>
  );
}
