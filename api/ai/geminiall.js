const axios = require('axios');
const FormData = require('form-data');

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'image/png'
    };
  } catch (e) {
    throw new Error(`Failed to download image: ${e.message}`);
  }
}

async function geminiChatWithImageUrl(options) {
  try {
    const { model, prompt, systemInstruction, history, imageUrl } = options;
    
    const formData = new FormData();
    formData.append('model', model || 'gemini-2.5-flash-lite');
    formData.append('prompt', prompt);
    
    if (systemInstruction) {
      formData.append('system_instruction', systemInstruction);
    }
    
    if (history) {
      formData.append('history', JSON.stringify(history));
    }
    
    // Download & append image
    if (imageUrl) {
      const imageData = await downloadImage(imageUrl);
      formData.append('media', imageData.buffer, {
        filename: 'image.png',
        contentType: imageData.contentType
      });
    }

    const response = await axios.post(
      'https://labs.shannzx.xyz/api/v1/gemmy/chat',
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    return response.data;
    
  } catch (e) {
    return { 
      success: false, 
      error: e.response?.data?.error || e.message 
    };
  }
}

module.exports = {
  name: "Gemini",
  desc: "Chat dengan AI Gemini menggunakan URL gambar | Support direct image URL",
  category: "AI",
  params: ["prompt", "model", "_system_instruction", "_history", "_image_url"],

  async run(req, res) {
    const { prompt, model, system_instruction, history, image_url } = req.query;
    
    if (!prompt) {
      return res.status(400).json({
        status: false,
        error: "Parameter 'prompt' is required"
      });
    }

    // Validasi model
    const validModels = [
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-3-flash-preview'
    ];

    const selectedModel = model || 'gemini-2.5-flash-lite';
    
    if (!validModels.includes(selectedModel)) {
      return res.status(400).json({
        status: false,
        error: `Invalid model. Available: ${validModels.join(', ')}`
      });
    }

    // Validasi URL gambar (optional)
    if (image_url) {
      const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)/i;
      if (!urlPattern.test(image_url)) {
        return res.status(400).json({
          status: false,
          error: "Invalid image URL. Must be a valid image link (jpg, png, gif, webp)"
        });
      }
    }

    // Parse history jika ada
    let parsedHistory = null;
    if (history) {
      try {
        parsedHistory = JSON.parse(history);
      } catch (e) {
        return res.status(400).json({
          status: false,
          error: "Invalid history format. Must be valid JSON"
        });
      }
    }

    const result = await geminiChatWithImageUrl({
      model: selectedModel,
      prompt: prompt,
      systemInstruction: system_instruction || 'Kamu adalah AI assistant yang membantu',
      history: parsedHistory,
      imageUrl: image_url
    });

    if (result.success === false) {
      return res.status(500).json({
        status: false,
        error: result.error
      });
    }

    // Format response
    const reply = result.reply || (result.history && result.history.length > 0
      ? result.history[result.history.length - 1].parts[0].text
      : 'No response');

    res.status(200).json({
      status: true,
      model: result.model_used || selectedModel,
      hasImage: !!image_url,
      imageUrl: image_url || null,
      data: {
        reply: reply.trim(),
        history: result.history || [],
        raw: result
      }
    });
  }
};
