import CoverflowFan from "@/components/templates/CoverflowFan";
import { SEC_TIGHT, IN_FULL } from "./editorial";

/**
 * "Browse the looks" — mockup `.sec-tight > .in.center` wrapping `.fan`.
 * The fan itself is the shared CoverflowFan (geometry frozen in
 * coverflow-math.ts); only its card chrome was restyled.
 */
export default function TemplateShowcase() {
  return (
    /* overflow-x-clip (not hidden) contains the fan's outer cards on narrow
       viewports without creating a scroll container — `hidden` would also
       flatten the 3D perspective on the track inside. The mockup leaks ~52px
       of horizontal scroll here; this is the accessibility divergence. */
    <section
      aria-labelledby="landing-templates-heading"
      className={`${SEC_TIGHT} overflow-x-clip`}
    >
      <div className={`${IN_FULL} text-center`}>
        <h2 id="landing-templates-heading" className="label mb-2">
          Browse the looks
        </h2>
        <CoverflowFan />
      </div>
    </section>
  );
}
