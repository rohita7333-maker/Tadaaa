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
          background: "#FAF9F6",
          text: "#1A1B18",
          accent: "#3E6B5C",
        },
      }}
    />
  );
}

registerRoot(Root);
