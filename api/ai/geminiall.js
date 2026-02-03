const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

// Setup multer untuk handle upload
const upload = multer({ storage: multer.memoryStorage() });

async function geminiChatWithImage(options) {
  try {
    const { model, prompt, systemInstruction, history, imageBuffer, imageName } = options;
    
    const formData = new FormData();
    formData.append('model', model || 'gemini-2.5-flash-lite');
    formData.append('prompt', prompt);
    
    if (systemInstruction) {
      formData.append('system_instruction', systemInstruction);
    }
    
    if (history) {
      formData.append('history', JSON.stringify(history));
    }
    
    // Append image dari buffer
    if (imageBuffer) {
      formData.append('media', imageBuffer, {
        filename: imageName || 'image.png',
        contentType: 'image/png'
      });
    }

    const response = await axios.post(
      'https://labs.shannzx.xyz/api/v1/gemmy/chat',
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 60000, // 60 detik untuk gambar
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
  name: "Gemini Upload",
  desc: "Chat dengan AI Gemini + Upload Gambar | Support multipart/form-data",
  category: "AI",
  params: ["prompt", "model", "system_instruction", "history", "media (file)"],

  run: [upload.single('media'), async (req, res) => {
    try {
      const { prompt, model, system_instruction, history } = req.body;
      
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

      // Parse history jika ada
      let parsedHistory = null;
      if (history) {
        try {
          parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
        } catch (e) {
          return res.status(400).json({
            status: false,
            error: "Invalid history format. Must be valid JSON"
          });
        }
      }

      // Cek apakah ada file upload
      let imageBuffer = null;
      let imageName = null;
      
      if (req.file) {
        imageBuffer = req.file.buffer;
        imageName = req.file.originalname;
      }

      const result = await geminiChatWithImage({
        model: selectedModel,
        prompt: prompt,
        systemInstruction: system_instruction || 'Kamu adalah AI assistant yang membantu',
        history: parsedHistory,
        imageBuffer: imageBuffer,
        imageName: imageName
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
        hasImage: !!imageBuffer,
        data: {
          reply: reply.trim(),
          history: result.history || [],
          raw: result
        }
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        error: error.message
      });
    }
  }]
};
