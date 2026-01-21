const axios = require('axios')

async function webpilotAI(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/webpilot-ai', {
      params: { text: text },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'application/json'
      }
    })

    return r.data
  } catch (e) {
    return { 
      success: false, 
      error: e.message 
    }
  }
}

module.exports = {
  name: "WebpilotAI",
  desc: "JSON Response | Realtime | Search",
  category: "AI",
  params: ["text"],

  async run(req, res) {
    const text = req.query.text
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Parameter 'text' is required"
      })
    }

    const result = await webpilotAI(text)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    // Mengambil data dari response
    const chat = result.result.chat
    const sources = result.result.source || []

    // Memetakan sumber web
    const webSources = sources.map(item => ({
      title: item.title,
      url: item.link
    }))

    res.status(200).json({
      status: true,
      query: text,
      data: {
        answer: chat.trim(),
        sources: webSources,
        total_sources: webSources.length,
        timestamp: result.timestamp,
        responseTime: result.responseTime
      }
    })
  }
}
