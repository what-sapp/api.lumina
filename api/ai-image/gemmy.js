const axios = require("axios");
const crypto = require("crypto");

const CONFIG = {
  IMAGEN: {
    URL: "https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models/imagen-4.0-fast-generate-001:predict",
    HEADERS: {
      "User-Agent": "ktor-client",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "x-goog-api-key": "AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ",
      "x-goog-api-client": "gl-kotlin/2.2.21-ai fire/17.7.0",
      "x-firebase-appid": "1:652803432695:android:c4341db6033e62814f33f2",
      "x-firebase-appversion": "91",
      "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05fRVJSVCJ9",
      "accept-charset": "UTF-8",
    },
  },
};

const uploadToCloud = async (buffer) => {
  try {
    const filename = `gemmy-${crypto.randomUUID()}.png`;
    const { data } = await axios.post("https://api.cloudsky.biz.id/get-upload-url", {
      fileKey: filename,
      contentType: "image/png",
      fileSize: buffer.length,
    });

    await axios.put(data.uploadUrl, buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": buffer.length,
        "x-amz-server-side-encryption": "AES256",
      },
    });

    return `https://api.cloudsky.biz.id/file?key=${encodeURIComponent(filename)}`;
  } catch (e) {
    return null;
  }
};

// ─── Main Image Generation Function ────────────────────
const handleImageGen = async (prompt, aspectRatio) => {
  const payload = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      includeRaiReason: true,
      includeSafetyAttributes: true,
      aspectRatio: aspectRatio,
      safetySetting: "block_low_and_above",
      personGeneration: "allow_adult",
      imageOutputOptions: { mimeType: "image/jpeg", compressionQuality: 100 },
    },
  };

  const response = await axios.post(CONFIG.IMAGEN.URL, payload, {
    headers: CONFIG.IMAGEN.HEADERS,
  });

  const prediction = response.data?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    return { success: false, msg: "No image generated" };
  }

  const imgBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
  const url = await uploadToCloud(imgBuffer);

  if (!url) return { success: false, msg: "Failed to upload image" };

  return { success: true, url, safetyAttributes: prediction.safetyAttributes };
};

// ─── Module Export ─────────────────────────────────────
module.exports = {
  name: "Gemmy AI Image Generator",
  desc: "JSON Response | AI Image Generator",
  category: "AI-IMAGE",
  params: ["prompt", "_aspectRatio"],
  async run(req, res) {
    try {
      const prompt = req.query.prompt;
      const aspectRatio = req.query.aspectRatio || "1:1";

      // ── Validasi ──
      if (!prompt) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "prompt" diperlukan',
        });
      }

      if (!["1:1", "16:9", "9:16", "4:3", "3:4"].includes(aspectRatio)) {
        return res.status(400).json({
          status: false,
          error: 'AspectRatio tidak valid. Pilih: "1:1", "16:9", "9:16", "4:3", "3:4"',
        });
      }

      // ── Handle Image Generation ──
      const result = await handleImageGen(prompt, aspectRatio);

      if (!result.success) {
        return res.status(500).json({ status: false, error: result.msg });
      }

      // ── Return ──
      res.status(200).json({
        status: true,
        data: result,
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
