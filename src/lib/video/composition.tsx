import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Sequence,
} from "remotion";

export interface PhotoSlide {
  url: string;
  caption?: string;
}

export interface SurpriseVideoProps {
  photos: PhotoSlide[];
  title: string;
  message: string;
  themeColors: {
    background: string;
    text: string;
    accent: string;
  };
}

function KenBurnsSlide({
  url,
  caption,
  direction,
}: {
  url: string;
  caption?: string;
  direction: "in" | "out";
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale =
    direction === "in"
      ? interpolate(frame, [0, durationInFrames], [1, 1.15])
      : interpolate(frame, [0, durationInFrames], [1.15, 1]);

  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0]
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={url}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      {caption && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            padding: "12px 24px",
          }}
        >
          <span
            style={{
              background: "rgba(0,0,0,0.5)",
              color: "white",
              padding: "8px 20px",
              borderRadius: 12,
              fontSize: 20,
              fontFamily: "system-ui",
            }}
          >
            {caption}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
}

function TitleCard({
  title,
  colors,
}: {
  title: string;
  colors: SurpriseVideoProps["themeColors"];
}) {
  const frame = useCurrentFrame();
  const scale = spring({ frame, fps: 30, from: 0.8, to: 1, durationInFrames: 20 });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: colors.background,
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: colors.text,
            fontFamily: "system-ui",
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 18,
            color: colors.accent,
            marginTop: 12,
            fontFamily: "system-ui",
          }}
        >
          Someone made this for you
        </p>
      </div>
    </AbsoluteFill>
  );
}

function MessageCard({
  message,
  colors,
}: {
  message: string;
  colors: SurpriseVideoProps["themeColors"];
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: colors.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
        opacity,
      }}
    >
      <p
        style={{
          fontSize: 24,
          lineHeight: 1.6,
          color: colors.text,
          textAlign: "center",
          fontFamily: "system-ui",
          maxWidth: 500,
        }}
      >
        {message}
      </p>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 14,
          color: colors.accent,
          fontFamily: "system-ui",
        }}
      >
        Made with ❤️ on TaDaaaa
      </div>
    </AbsoluteFill>
  );
}

const SLIDE_DURATION = 90; // 3 seconds per photo at 30fps
const TITLE_DURATION = 75; // 2.5s
const MESSAGE_DURATION = 120; // 4s

export function SurpriseVideo({ photos, title, message, themeColors }: SurpriseVideoProps) {
  let offset = 0;

  return (
    <AbsoluteFill style={{ background: themeColors.background }}>
      <Sequence from={offset} durationInFrames={TITLE_DURATION}>
        <TitleCard title={title} colors={themeColors} />
      </Sequence>
      {(offset += TITLE_DURATION - 15) && null}

      {photos.map((photo, i) => {
        const start = offset + i * (SLIDE_DURATION - 15);
        return (
          <Sequence key={i} from={start} durationInFrames={SLIDE_DURATION}>
            <KenBurnsSlide
              url={photo.url}
              caption={photo.caption}
              direction={i % 2 === 0 ? "in" : "out"}
            />
          </Sequence>
        );
      })}

      <Sequence
        from={offset + photos.length * (SLIDE_DURATION - 15)}
        durationInFrames={MESSAGE_DURATION}
      >
        <MessageCard message={message} colors={themeColors} />
      </Sequence>
    </AbsoluteFill>
  );
}

export function calculateDuration(photoCount: number) {
  return (
    TITLE_DURATION +
    (photoCount > 0 ? photoCount * (SLIDE_DURATION - 15) + 15 : 0) +
    MESSAGE_DURATION
  );
}
