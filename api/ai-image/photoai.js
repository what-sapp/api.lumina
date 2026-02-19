const axios = require("axios");
const FormData = require("form-data");
const crypto = require("crypto");

const CONFIG = {
  BASE_URL: "https://photoai.imglarger.com/api/PhoAi",
  HEADERS: {
    "User-Agent": "Dart/3.9 (dart:io)",
    "Accept-Encoding": "gzip",
  },
  TYPE_MAP: {
    upscale: "0",
    sharpen: "1",
    retouch: "3",
  },
};

// ─── Helpers ───────────────────────────────────────────
const generateRandomUser = () =>
  `${crypto.randomBytes(8).toString("hex")}_aiimglarger`;

const fetchImageBuffer = async (url) => {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: CONFIG.HEADERS,
    timeout: 15000,
  });
  return Buffer.from(res.data);
};

const pollStatus = async (code, type) => {
  const maxAttempts = 20;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { data } = await axios.post(
        `${CONFIG.BASE_URL}/CheckStatus`,
        {
          code,
          type: parseInt(type),
          username: generateRandomUser(),
        },
        {
          headers: {
            ...CONFIG.HEADERS,
            "Content-Type": "application/json;charset=UTF-8",
          },
          timeout: 10000,
        }
      );

      if (data.data?.status === "success") {
        return { success: true, url: data.data.downloadUrls[0] };
      }

      if (data.data?.status === "failed") {
        return { success: false, msg: "Processing failed on server" };
      }

      await new Promise((r) => setTimeout(r, 3000));
    } catch (e) {
      return { success: false, msg: e.message };
    }
  }

  return { success: false, msg: "Timeout: server tidak merespons" };
};

const uploadImage = async (imageBuffer, type, scale) => {
  const form = new FormData();

  form.append("type", type);
  form.append("username", generateRandomUser());
  if (type === "0" && scale) {
    form.append("scaleRadio", scale.toString());
  }
  form.append("file", imageBuffer, { filename: "image.jpg", contentType: "image/jpeg" });

  const { data } = await axios.post(`${CONFIG.BASE_URL}/Upload`, form, {
    headers: { ...CONFIG.HEADERS, ...form.getHeaders() },
    timeout: 30000,
  });

  if (data.code === 200 && data.data) {
    return await pollStatus(data.data, type);
  }

  return { success: false, msg: data.msg || "Upload failed" };
};

// ─── Module Export ─────────────────────────────────────
module.exports = {
  name: "PhotoAI Image Enhancer",
  desc: "JSON Response | Upscale, Retouch, dan Sharpen image",
  category: "AI IMAGE",
  params: ["imageUrl", "action", "scale"],
  async run(req, res) {
    try {
      const imageUrl = req.query.imageUrl;
      const action = req.query.action;
      const scale = req.query.scale;

      // ── Validasi ──
      if (!imageUrl || !action) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "imageUrl" dan "action" diperlukan',
        });
      }

      const normalizedAction = action.toLowerCase().trim();

      if (!CONFIG.TYPE_MAP[normalizedAction]) {
        return res.status(400).json({
          status: false,
          error: 'Action tidak valid. Pilih: "upscale", "sharpen", atau "retouch"',
        });
      }

      if (normalizedAction === "upscale" && scale && !["2", "4", "8"].includes(scale)) {
        return res.status(400).json({
          status: false,
          error: 'Scale tidak valid. Pilih: "2", "4", atau "8"',
        });
      }

      // ── Fetch & Upload ──
      const imageBuffer = await fetchImageBuffer(imageUrl);
      const type = CONFIG.TYPE_MAP[normalizedAction];
      const finalScale = normalizedAction === "upscale" ? (scale || "4") : undefined;
      const result = await uploadImage(imageBuffer, type, finalScale);

      if (!result.success) {
        return res.status(500).json({ status: false, error: result.msg });
      }

      // ── Return ──
      res.status(200).json({
        status: true,
        data: {
          action: normalizedAction,
          scale: finalScale || null,
          outputUrl: result.url,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        statusCode: 500,
        creator: "robin",
        error: error.message,
      });
    }
  },
};
