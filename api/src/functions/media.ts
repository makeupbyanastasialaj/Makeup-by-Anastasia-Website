import { app, HttpRequest } from "@azure/functions";
import { putImage, deleteImage, getImage } from "../lib/blob";
import { updateSettings } from "../lib/repo";
import { ok, badRequest, unauthorized, isAdmin, parseBody, json } from "../lib/http";

const KEYS = ["logo", "about"] as const;
type Key = (typeof KEYS)[number];
const URL_FIELD: Record<Key, "logoImageUrl" | "aboutImageUrl"> = {
  logo: "logoImageUrl",
  about: "aboutImageUrl",
};

// GET /api/media/{key} — serve a brand image (public).
app.http("mediaGet", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "media/{key}",
  handler: async (request: HttpRequest) => {
    const key = request.params.key;
    if (!KEYS.includes(key as Key)) return { status: 404 };
    const img = await getImage(key);
    if (!img) return { status: 404 };
    return {
      status: 200,
      body: img.buffer,
      headers: { "Content-Type": img.contentType, "Cache-Control": "public, max-age=300" },
    };
  },
});

// POST /api/manage/upload  { kind, dataUrl }  — upload or (empty dataUrl) remove.
app.http("mediaUpload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "manage/upload",
  handler: async (request: HttpRequest) => {
    if (!(await isAdmin(request))) return unauthorized();
    const { kind, dataUrl } = await parseBody<{ kind?: string; dataUrl?: string }>(request);
    if (!kind || !KEYS.includes(kind as Key)) return badRequest("Unknown image type.");
    const field = URL_FIELD[kind as Key];
    const raw = typeof dataUrl === "string" ? dataUrl : "";

    if (raw === "") {
      await deleteImage(kind);
      await updateSettings({ [field]: "" });
      return ok({ url: "" });
    }
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(raw)) {
      return badRequest("Unsupported image format. Please use a PNG, JPG or WebP.");
    }
    if (raw.length > 1_500_000) {
      return badRequest("That image is too large. Please use a smaller one.");
    }
    try {
      await putImage(kind, raw);
    } catch {
      return json(500, { error: "Couldn't store the image. Please try again." });
    }
    const url = `/api/media/${kind}?v=${Date.now()}`;
    await updateSettings({ [field]: url });
    return ok({ url });
  },
});
