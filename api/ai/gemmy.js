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

const fileToBase64 = (file) => {
  return file.buffer.toString("base64");
};

const getMimeType = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  const mimes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return mimes[ext] || "application/octet-stream";
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

// ─── Main Chat Function ────────────────────────────────
const handleChat = async (prompt, imageSource, isFile = false) => {
  let parts = [];

  if (imageSource) {
    let base64, mimeType;
    
    if (isFile) {
      // Dari file upload
      base64 = fileToBase64(imageSource);
      mimeType = imageSource.mimetype;
    } else {
      // Dari URL
      base64 = await toBase64(imageSource);
      mimeType = getMimeType(imageSource);
    }
    
    if (base64) {
      parts.push({ inlineData: { mimeType, data: base64 } });
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

// ─── Module Export ─────────────────────────────────────
module.exports = {
  name: "Gemmy AI Chat",
  desc: "AI Chat with optional image support (upload or URL)",
  category: "AI",
  method: "POST",
  
  // ✅ Params array (cara lama)
  params: ["prompt", "_image", "_imageUrl"],
  
  // ✅ Config tambahan untuk upload & dropdown
  paramConfig: {
    "prompt": {
      description: "Your question or message to AI",
      placeholder: "Ask me anything..."
    },
    "_image": {
      type: "file",
      description: "Upload an image (optional)",
      accept: "image/jpeg,image/jpg,image/png,image/webp,image/gif",
      maxSize: "10MB"
    },
    "_imageUrl": {
      description: "Or provide image URL (optional)",
      placeholder: "https://example.com/image.jpg"
    }
  },

  async run(req, res) {
    try {
      // ✅ Support both GET & POST
      const prompt = req.body.prompt || req.query.prompt;
      const imageUrl = req.body.imageUrl || req.query.imageUrl;
      
      // ✅ File upload dari multer (hanya untuk POST)
      const imageFile = req.files?.find(f => f.fieldname === 'image');

      // ── Validasi ──
      if (!prompt || prompt.trim() === '') {
        return res.status(400).json({
          status: false,
          error: 'Parameter "prompt" is required'
        });
      }

      // ── Determine image source ──
      let imageSource = null;
      let isFile = false;

      if (imageFile) {
        imageSource = imageFile;
        isFile = true;
      } else if (imageUrl && imageUrl.trim() !== '') {
        imageSource = imageUrl;
        isFile = false;
      }

      // ── Handle Chat ──
      const result = await handleChat(prompt, imageSource, isFile);

      if (!result.success) {
        return res.status(500).json({ 
          status: false, 
          error: result.msg 
        });
      }

      // ── Return ──
      res.status(200).json({
        status: true,
        data: {
          reply: result.reply,
          usage: result.usage,
          hasImage: !!imageSource,
          imageType: isFile ? "uploaded" : imageUrl ? "url" : "none"
        }
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        statusCode: 500,
        creator: "robin",
        error: error.message
      });
    }
  }
};
