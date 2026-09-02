import jsQR from "jsqr";

/**
 * Decodes a QR code from an image element, video, canvas, Blob, or File using jsQR with BarcodeDetector fallback.
 */
export async function decodeQrFromImage(
  source: CanvasImageSource | Blob | File
): Promise<string | null> {
  let imgElement: CanvasImageSource;

  if (source instanceof Blob || source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    const img = new Image();
    img.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
    });
    URL.revokeObjectURL(objectUrl);
    imgElement = img;
  } else {
    imgElement = source;
  }

  // 1. Try canvas + jsQR (universal across all browsers/webviews)
  try {
    const canvas = document.createElement("canvas");
    let width = 0;
    let height = 0;

    if (imgElement instanceof HTMLVideoElement) {
      width = imgElement.videoWidth || imgElement.width;
      height = imgElement.videoHeight || imgElement.height;
    } else if (imgElement instanceof HTMLImageElement) {
      width = imgElement.naturalWidth || imgElement.width;
      height = imgElement.naturalHeight || imgElement.height;
    } else {
      width = (imgElement as any).width || 0;
      height = (imgElement as any).height || 0;
    }

    if (width > 0 && height > 0) {
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(imgElement, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code && code.data && code.data.trim()) {
          return code.data.trim();
        }
      }
    }
  } catch (e) {
    console.warn("jsQR decode attempt failed:", e);
  }

  // 2. Fallback to native BarcodeDetector if available
  if ("BarcodeDetector" in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code"],
      });
      const barcodes = await detector.detect(imgElement);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch (e) {
      console.warn("BarcodeDetector fallback failed:", e);
    }
  }

  return null;
}

/**
 * Checks system clipboard for either an image screenshot containing a QR code,
 * an otpauth:// URI, or a raw Base32 2FA secret key.
 */
export async function readClipboardForTotp(): Promise<{
  type: "qr" | "uri" | "key";
  data: string;
} | null> {
  // 1. First, check for images in clipboard (e.g. user took a screenshot with ⇧⌘4 or Win+Shift+S)
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const decoded = await decodeQrFromImage(blob);
            if (decoded) {
              return { type: "qr", data: decoded };
            }
          }
        }
      }
    }
  } catch (e) {
    console.debug("Clipboard image read error / permission:", e);
  }

  // 2. Check for text in clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) {
        if (text.startsWith("otpauth://")) {
          return { type: "uri", data: text };
        }
        // Check if looks like a Base32 key (at least 16 alphanum chars A-Z 2-7)
        const clean = text.replace(/[\s-]+/g, "").toUpperCase();
        if (/^[A-Z2-7]{16,64}$/.test(clean)) {
          return { type: "key", data: clean };
        }
      }
    }
  } catch (e) {
    console.debug("Clipboard text read error:", e);
  }

  return null;
}
