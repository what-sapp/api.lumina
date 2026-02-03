const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function geminiChat(options) {
  try {
    const { model, prompt, systemInstruction, history, mediaPath } = options;
    
    const formData = new FormData();
    formData.append('model', model || 'gemini-2.5-flash-lite');
    formData.append('prompt', prompt);
    
    if (systemInstruction) {
      formData.append('system_instruction', systemInstruction);
    }
    
    if (history) {
      formData.append('history', JSON.stringify(history));
    }
    
    if (mediaPath && fs.existsSync(mediaPath)) {
      formData.append('media', fs.createReadStream(mediaPath));
    }

    const response = await axios.post(
      'https://labs.shannzx.xyz/api/v1/gemmy/chat',
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000 // 30 detik timeout
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
  name: "Gemini Chat",
  desc: "Chat dengan AI Gemini - Support text & image | Model: 2.0 Flash Lite, 2.0 Flash, 2.5 Flash Lite, 2.5 Flash, 3 Flash Preview",
  category: "AI",
  params: ["prompt", "model", "system_instruction", "history"],

  async run(req, res) {
    const { prompt, model, system_instruction, history } = req.query;
    
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

    // Parse history jika ada (format JSON string)
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

    const result = await geminiChat({
      model: selectedModel,
      prompt: prompt,
      systemInstruction: system_instruction || 'Kamu adalah AI assistant yang membantu',
      history: parsedHistory
    });

    if (result.success === false) {
      return res.status(500).json({
        status: false,
        error: result.error
      });
    }

    // Format response
    const reply = result.history && result.history.length > 0
      ? result.history[result.history.length - 1].parts[0].text
      : result.reply || 'No response';

    res.status(200).json({
      status: true,
      model: result.model_used || selectedModel,
      data: {
        reply: reply.trim(),
        history: result.history || [],
        raw: result
      }
    });
  }
};
