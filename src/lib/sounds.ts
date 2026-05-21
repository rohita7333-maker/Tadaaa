const SOUND_URLS = {
  reveal: "/sounds/reveal.mp3",
  celebrate: "/sounds/celebrate.mp3",
  pop: "/sounds/pop.mp3",
} as const;

type SoundName = keyof typeof SOUND_URLS;

const audioCache = new Map<string, HTMLAudioElement>();

export function playSound(name: SoundName, volume = 0.5) {
  if (typeof window === "undefined") return;

  const url = SOUND_URLS[name];
  let audio = audioCache.get(url);

  if (!audio) {
    audio = new Audio(url);
    audioCache.set(url, audio);
  }

  audio.volume = Math.min(1, Math.max(0, volume));
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/**
 * Release cached HTMLAudioElement nodes. Call when leaving a screen that
 * preloaded sounds (e.g. on unmount of the surprise reveal flow). Without this
 * the module-level cache retains <audio> nodes for the lifetime of the tab.
 */
export function releaseSounds(names?: SoundName[]) {
  if (typeof window === "undefined") return;
  const urls = (names ?? (Object.keys(SOUND_URLS) as SoundName[])).map((n) => SOUND_URLS[n]);
  for (const url of urls) {
    const audio = audioCache.get(url);
    if (!audio) continue;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      // best-effort cleanup
    }
    audioCache.delete(url);
  }
}
