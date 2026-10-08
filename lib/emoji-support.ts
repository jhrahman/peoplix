// Client-only: can this device actually draw an emoji? Emojis added after a
// device's emoji font was built (Salute 🫡, Melting face 🫠, Heart hands 🫶 and
// friends arrived in 2021 to 2022) show up as an empty box on older Windows,
// Android and Linux. Rather than show a broken box, the picker skips them and
// reaction chips fall back to the emoji's name.
//
// How it works: draw the emoji on a small canvas. A real colour emoji has
// coloured pixels; the "missing glyph" box is plain black/grey. Multi-person and
// profession emojis (joined with a zero-width joiner) can also fail by drawing
// as two separate emojis side by side, so those are checked for width too.

const SIZE = 32;
const cache = new Map<string, boolean>();
let context: CanvasRenderingContext2D | null | undefined;

function getContext() {
  if (context !== undefined) return context;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE * 2;
    canvas.height = SIZE;
    context = canvas.getContext("2d", { willReadFrequently: true });
    if (context) {
      context.textBaseline = "top";
      context.font = `${SIZE - 6}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    }
  } catch {
    context = null;
  }
  return context;
}

export function isEmojiSupported(emoji: string): boolean {
  // On the server (and if canvas is unavailable) assume yes: showing an emoji
  // is better than hiding one we merely couldn't test.
  if (typeof document === "undefined") return true;

  const cached = cache.get(emoji);
  if (cached !== undefined) return cached;

  const ctx = getContext();
  if (!ctx) return true;

  let supported = false;
  try {
    ctx.clearRect(0, 0, SIZE * 2, SIZE);
    ctx.fillText(emoji, 0, 0);
    const { data } = ctx.getImageData(0, 0, SIZE * 2, SIZE);

    // Any visible pixel that isn't grey means a colour glyph was drawn.
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2])) {
        supported = true;
        break;
      }
    }

    // A joined sequence that the font can't build is drawn as its parts side by
    // side - about twice as wide as one emoji.
    if (supported && emoji.includes("‍")) {
      supported = ctx.measureText(emoji).width < ctx.measureText("\u{1F642}").width * 1.5;
    }
  } catch {
    supported = true;
  }

  cache.set(emoji, supported);
  return supported;
}
