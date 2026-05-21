import { registerRoot, Composition } from "remotion";
import { SurpriseVideo, calculateDuration } from "./composition";

function Root() {
  return (
    <Composition
      id="SurpriseVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={SurpriseVideo as any}
      durationInFrames={calculateDuration(4)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        photos: [],
        title: "Your Surprise",
        message: "A special message for you",
        themeColors: {
          background: "#FFF8F0",
          text: "#2D2926",
          accent: "#C4686D",
        },
      }}
    />
  );
}

registerRoot(Root);
