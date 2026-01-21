const axios = require('axios')

async function ayesoul(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/ayesoul', {
      params: { text },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'application/json',
        'Origin': 'https://api.nekolabs.web.id'
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
  name: "AyeSoulAI",
  desc: "JSON Respone | Realtime | Search",
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

    const result = await ayesoul(text)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    // Mengirimkan seluruh response (termasuk message, sources, dan timestamp)
    res.status(200).json({
      status: true,
      query: text,
      data: {
        answer: result.result.message,
        sources: result.result.sourcesRaw,
        timestamp: result.timestamp,
        runtime: result.responseTime
      }
    })
  }
}
