const axios = require('axios')

async function simiSimiAI(text, lang = 'id') {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/simisimi', {
      params: { 
        text: text,
        lang: lang 
      },
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
  name: "SimSimiAI",
  desc: "JSON Response | Roleplay",
  category: "AI",
  params: ["text", "lang"],

  async run(req, res) {
    const text = req.query.text
    const lang = req.query.lang || 'id' // default Indonesia
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Parameter 'text' is required"
      })
    }

    const result = await simiSimiAI(text, lang)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    res.status(200).json({
      status: true,
      query: text,
      language: lang,
      data: {
        answer: result.result,
        timestamp: result.timestamp,
        responseTime: result.responseTime
      }
    })
  }
}
