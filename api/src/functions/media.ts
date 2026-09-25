import { app, HttpRequest } from "@azure/functions";
import { putImage, deleteImage, getImage } from "../lib/blob";
import { getSettings, updateSettings } from "../lib/repo";
import { ok, badRequest, unauthorized, isAdmin, parseBody, json } from "../lib/http";

export const GALLERY_N = 6;

function isServeKey(k: string): boolean {
  return k === "logo" || k === "about" || /^gallery[0-5]$/.test(k);
}

// GET /api/media/{key} — serve a brand image (public).
app.http("mediaGet", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "media/{key}",
  handler: async (request: HttpRequest) => {
    const key = request.params.key;
    if (!isServeKey(key)) return { status: 404 };
    const img = await getImage(key);
    if (!img) return { status: 404 };
    return {
      status: 200,
      body: img.buffer,
      // URLs are versioned (?v=timestamp) and change on re-upload, so cache hard.
      headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    };
  },
});

// POST /api/manage/upload  { kind, index?, dataUrl }  — upload or (empty dataUrl) remove.
app.http("mediaUpload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/upload",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { kind, index, dataUrl } = await parseBody<{ kind?: string; index?: number; dataUrl?: string }>(request);
    const raw = typeof dataUrl === "string" ? dataUrl : "";

    if (raw !== "") {
      if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(raw)) {
        return badRequest("Unsupported image format. Please use a PNG, JPG or WebP.");
      }
      if (raw.length > 1_500_000) {
        return badRequest("That image is too large. Please use a smaller one.");
      }
    }

    // Determine the blob key + how to record the resulting URL in settings.
    let blobKey: string;
    let record: (url: string) => Promise<void>;

    if (kind === "logo" || kind === "about") {
      blobKey = kind;
      const field = kind === "logo" ? "logoImageUrl" : "aboutImageUrl";
      record = (url) => updateSettings({ [field]: url });
    } else if (kind === "gallery") {
      const idx = Number(index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= GALLERY_N) return badRequest("Invalid gallery slot.");
      blobKey = `gallery${idx}`;
      record = async (url) => {
        const s = await getSettings();
        let arr: string[] = [];
        try {
          arr = JSON.parse(s.galleryUrls || "[]");
        } catch {
          arr = [];
        }
        while (arr.length < GALLERY_N) arr.push("");
        arr[idx] = url;
        await updateSettings({ galleryUrls: JSON.stringify(arr) });
      };
    } else {
      return badRequest("Unknown image type.");
    }

    if (raw === "") {
      await deleteImage(blobKey);
      await record("");
      return ok({ url: "" });
    }
    try {
      await putImage(blobKey, raw);
    } catch {
      return json(500, { error: "Couldn't store the image. Please try again." });
    }
    const url = `/api/media/${blobKey}?v=${Date.now()}`;
    await record(url);
    return ok({ url });
  },
});
