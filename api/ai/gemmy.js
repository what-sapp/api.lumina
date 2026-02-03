const axios = require("axios");
const crypto = require("crypto");

const CONFIG = {
  GEMINI: {
    URL: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    API_KEY: "AIzaSyAKbxdxfyNoQMx9ft9xAVoQWrwpN9JnphY",
    HEADERS: {
      "User-Agent": "okhttp/5.3.2",
      "Accept-Encoding": "gzip",
      "x-goog-api-key": "AIzaSyAKbxdxfyNoQMx9ft9xAVoQWrwpN9JnphY",
      "x-android-package": "com.jetkite.gemmy",
      "x-android-cert": "037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2",
      "Content-Type": "application/json; charset=UTF-8",
    },
  },
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
      "x-firebase-appcheck": "eyJlcnJvciI6IlVOS05PV05_RVJSVCifQ==",
      "accept-charset": "UTF-8",
    },
  },
  REMOTE_CONFIG_URL:
    "https://firebasestorage.googleapis.com/v0/b/gemmy-ai-bdc03.appspot.com/o/remote_config.json?alt=media",
};

const SYSTEM_INSTRUCTION = {
  role: "user",
  parts: [
    {
      text: "You are a helpful assistant. Keep your answers concise. Provide no more than 3–4 paragraphs unless the user explicitly asks for a longer explanation.",
    },
  ],
};

// ─── Helpers ───────────────────────────────────────────
const decrypt = (encryptedBase64) => {
  try {
    const inputBytes = Buffer.from(encryptedBase64, "base64");
    const keyBytes = Buffer.from("G3mmy@pp_2025_S3cur3K3y!", "utf-8");
    const outputBytes = Buffer.alloc(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i++) {
      outputBytes[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return outputBytes.toString("utf-8");
  } catch (e) {
    return null;
  }
};

const refreshApiKey = async () => {
  try {
    const { data } = await axios.get(CONFIG.REMOTE_CONFIG_URL, {
      headers: { "User-Agent": "okhttp/5.3.2", "Accept-Encoding": "gzip" },
    });

    const encryptedKey = data?.remote_config?.[0]?.gemini_api_key;
    if (!encryptedKey) return false;

    const decryptedKey = decrypt(encryptedKey);
    if (!decryptedKey) return false;

    CONFIG.GEMINI.API_KEY = decryptedKey;
    CONFIG.GEMINI.HEADERS["x-goog-api-key"] = decryptedKey;
    return true;
  } catch (e) {
    return false;
  }
};

const toBase64 = async (url) => {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return Buffer.from(res.data).toString("base64");
  } catch (e) {
    return null;
  }
};

const getMimeType = (url) => {
  const ext = url.split(".").pop().toLowerCase();
  const mimes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return mimes[ext] || "application/octet-stream";
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

const executeGeminiRequest = async (contents) => {
  const payload = {
    contents,
    generationConfig: { maxOutputTokens: 800, temperature: 0.9 },
    systemInstruction: SYSTEM_INSTRUCTION,
  };

  try {
    return await axios.post(CONFIG.GEMINI.URL, payload, {
      headers: CONFIG.GEMINI.HEADERS,
    });
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.error?.message || "";
    const isKeyError = status === 403 || (status === 400 && msg.includes("API key"));

    if (isKeyError && (await refreshApiKey())) {
      return await axios.post(CONFIG.GEMINI.URL, payload, {
        headers: CONFIG.GEMINI.HEADERS,
      });
    }
    throw error;
  }
};

// ─── Chat ──────────────────────────────────────────────
const handleChat = async (prompt, imageUrl) => {
  let parts = [];

  if (imageUrl) {
    const base64 = await toBase64(imageUrl);
    if (base64) {
      parts.push({ inlineData: { mimeType: getMimeType(imageUrl), data: base64 } });
    }
  }

  parts.push({ text: prompt });

  const contents = [{ role: "user", parts }];
  const response = await executeGeminiRequest(contents);

  const candidate = response.data?.candidates?.[0];
  if (!candidate) return { success: false, msg: "No response candidates found" };

  return {
    success: true,
    reply: candidate.content.parts[0].text,
    usage: response.data.usageMetadata,
  };
};

// ─── Image Gen ─────────────────────────────────────────
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
  name: "Gemmy AI",
  desc: "JSON Response | AI Chat & Image Generator",
  category: "AI",
  params: ["action", "prompt", "imageUrl", "aspectRatio"],
  async run(req, res) {
    try {
      const action = req.query.action;
      const prompt = req.query.prompt;
      const imageUrl = req.query.imageUrl;
      const aspectRatio = req.query.aspectRatio || "1:1";

      // ── Validasi ──
      if (!action) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "action" diperlukan. Pilih: "chat" atau "generate"',
        });
      }

      if (!prompt) {
        return res.status(400).json({
          status: false,
          error: 'Parameter "prompt" diperlukan',
        });
      }

      if (!["chat", "generate"].includes(action)) {
        return res.status(400).json({
          status: false,
          error: 'Action tidak valid. Pilih: "chat" atau "generate"',
        });
      }

      if (action === "generate" && !["1:1", "16:9", "9:16", "4:3", "3:4"].includes(aspectRatio)) {
        return res.status(400).json({
          status: false,
          error: 'AspectRatio tidak valid. Pilih: "1:1", "16:9", "9:16", "4:3", "3:4"',
        });
      }

      // ── Handle Action ──
      let result;
      if (action === "chat") {
        result = await handleChat(prompt, imageUrl);
      } else {
        result = await handleImageGen(prompt, aspectRatio);
      }

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
