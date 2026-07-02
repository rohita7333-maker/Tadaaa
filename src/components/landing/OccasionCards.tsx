/**
 * Three animated SVG hero cards — birthday, mother's day, anniversary.
 * Ported verbatim from tadaaaa-app-animated_1.html (.heroart / .occard SVGs).
 * Pure CSS keyframe animation (defined in globals.css), no JS runtime.
 * All loops disabled under prefers-reduced-motion via the globals.css media query.
 */
export function OccasionCards() {
  return (
    <div className="heroart">
      {/* BIRTHDAY: kid in party hat behind a cake with flickering candle */}
      <div className="occard">
        <div className="stage bg-bday">
          <svg viewBox="0 0 100 100" aria-label="Birthday cartoon">
            <rect className="an-confetti" x="20" y="8" width="4" height="6" rx="1" fill="#C4686D" style={{ animationDelay: "0s" }} />
            <rect className="an-confetti" x="74" y="6" width="4" height="6" rx="1" fill="#C9A96E" style={{ animationDelay: ".8s" }} />
            <rect className="an-confetti" x="50" y="4" width="4" height="6" rx="1" fill="#9B3D42" style={{ animationDelay: "1.5s" }} />
            <g className="an-body">
              <polygon points="50,18 42,34 58,34" fill="#C4686D" />
              <circle cx="50" cy="17" r="2.5" fill="#E8D5A8" />
              <circle cx="50" cy="42" r="11" fill="#F3C9A8" />
              <g className="an-blink"><circle cx="46" cy="42" r="1.6" fill="#2D2926" /><circle cx="54" cy="42" r="1.6" fill="#2D2926" /></g>
              <circle cx="43.5" cy="46" r="2" fill="#E8A5A8" opacity=".7" />
              <circle cx="56.5" cy="46" r="2" fill="#E8A5A8" opacity=".7" />
              <path d="M45 48 Q50 52 55 48" stroke="#2D2926" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <rect className="an-wave" x="32" y="52" width="5" height="14" rx="2.5" fill="#F3C9A8" />
              <rect x="63" y="52" width="5" height="14" rx="2.5" fill="#F3C9A8" transform="rotate(-12 65 59)" />
            </g>
            <rect x="34" y="74" width="32" height="16" rx="3" fill="#fff" />
            <rect x="34" y="74" width="32" height="6" rx="3" fill="#C4686D" />
            <rect x="49" y="62" width="2" height="12" fill="#E8D5A8" />
            <g className="an-flame"><ellipse cx="50" cy="60" rx="2.4" ry="4" fill="#FFB23C" /><ellipse cx="50" cy="61" rx="1.2" ry="2" fill="#FFE9A8" /></g>
          </svg>
        </div>
        <div className="cap">happy birthday!</div>
      </div>

      {/* MOTHER'S DAY: child offering flowers to mom, hearts popping */}
      <div className="occard">
        <div className="stage bg-mom">
          <svg viewBox="0 0 100 100" aria-label="Mother's Day cartoon">
            <path className="an-heart" d="M50 30 l-3 -3 a2 2 0 1 0 -3 3 l6 6 l6 -6 a2 2 0 1 0 -3 -3 z" fill="#C4686D" style={{ animationDelay: "0s" }} transform="translate(-6,0)" />
            <path className="an-heart" d="M50 30 l-3 -3 a2 2 0 1 0 -3 3 l6 6 l6 -6 a2 2 0 1 0 -3 -3 z" fill="#9B3D42" style={{ animationDelay: "1.3s" }} transform="translate(10,2)" />
            <g className="an-body">
              <circle cx="38" cy="40" r="10" fill="#F3C9A8" />
              <path d="M28 38 a10 10 0 0 1 20 0 q0 -12 -10 -12 q-10 0 -10 12z" fill="#7A4B3A" />
              <g className="an-blink"><circle cx="35" cy="40" r="1.4" fill="#2D2926" /><circle cx="41" cy="40" r="1.4" fill="#2D2926" /></g>
              <path d="M35 44 Q38 47 41 44" stroke="#2D2926" strokeWidth="1.4" fill="none" strokeLinecap="round" />
              <rect x="31" y="50" width="14" height="22" rx="6" fill="#C4686D" />
            </g>
            <g>
              <circle cx="66" cy="50" r="8" fill="#F3C9A8" />
              <g className="an-blink"><circle cx="63.5" cy="50" r="1.2" fill="#2D2926" /><circle cx="68.5" cy="50" r="1.2" fill="#2D2926" /></g>
              <path d="M63 53 Q66 55 69 53" stroke="#2D2926" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <rect x="60" y="58" width="12" height="16" rx="5" fill="#C9A96E" />
              <g className="an-offer">
                <rect x="52" y="60" width="10" height="4" rx="2" fill="#F3C9A8" />
                <circle cx="51" cy="61" r="3" fill="#E8A5A8" />
                <circle cx="48" cy="59" r="3" fill="#C4686D" />
                <circle cx="48" cy="63" r="3" fill="#E8D5A8" />
                <rect x="50" y="62" width="2" height="8" fill="#6B8E4E" />
              </g>
            </g>
          </svg>
        </div>
        <div className="cap">love you, mom</div>
      </div>

      {/* ANNIVERSARY: couple clinking glasses, hearts above */}
      <div className="occard">
        <div className="stage bg-anniv">
          <svg viewBox="0 0 100 100" aria-label="Anniversary cartoon">
            <path className="an-heart" d="M50 26 l-3 -3 a2 2 0 1 0 -3 3 l6 6 l6 -6 a2 2 0 1 0 -3 -3 z" fill="#C4686D" style={{ animationDelay: ".2s" }} />
            <g className="an-body">
              <circle cx="36" cy="42" r="9" fill="#F3C9A8" />
              <path d="M27 40 a9 9 0 0 1 18 0 q0 -11 -9 -11 q-9 0 -9 11z" fill="#3A2E28" />
              <g className="an-blink"><circle cx="33.5" cy="42" r="1.3" fill="#2D2926" /><circle cx="38.5" cy="42" r="1.3" fill="#2D2926" /></g>
              <path d="M33 45 Q36 48 39 45" stroke="#2D2926" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              <rect x="30" y="51" width="12" height="20" rx="5" fill="#9B3D42" />
              <g className="an-clink-l"><rect x="44" y="50" width="3" height="9" fill="#E8D5A8" /><path d="M42 48 h7 l-1.5 4 h-4 z" fill="#F7E6C8" opacity=".9" /></g>
            </g>
            <g className="an-body" style={{ animationDelay: ".4s" }}>
              <circle cx="64" cy="42" r="9" fill="#F3C9A8" />
              <path d="M55 42 a9 9 0 0 1 18 -2 q0 -10 -9 -10 q-10 0 -9 12z" fill="#6B4A38" />
              <g className="an-blink"><circle cx="61.5" cy="42" r="1.3" fill="#2D2926" /><circle cx="66.5" cy="42" r="1.3" fill="#2D2926" /></g>
              <path d="M61 45 Q64 48 67 45" stroke="#2D2926" strokeWidth="1.3" fill="none" strokeLinecap="round" />
              <rect x="58" y="51" width="12" height="20" rx="5" fill="#C4686D" />
              <g className="an-clink-r"><rect x="53" y="50" width="3" height="9" fill="#E8D5A8" /><path d="M51 48 h7 l-1.5 4 h-4 z" fill="#F7E6C8" opacity=".9" /></g>
            </g>
          </svg>
        </div>
        <div className="cap">5 years 🥂</div>
      </div>
    </div>
  );
}
