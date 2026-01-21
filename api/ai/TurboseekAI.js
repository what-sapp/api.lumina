const axios = require('axios')

async function turboseekAI(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/turboseek', {
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
  name: "TurboseekAI",
  desc: "JSON Response | GPT Based",
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

    const result = await turboseekAI(text)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    // Mengambil data dari response
    const answer = result.result.answer
    const sources = result.result.sources || []
    const similarQuestions = result.result.similarQuestions || []

    res.status(200).json({
      status: true,
      query: text,
      data: {
        answer: answer.trim(),
        sources: sources,
        total_sources: sources.length,
        similarQuestions: similarQuestions,
        timestamp: result.timestamp,
        responseTime: result.responseTime
      }
    })
  }
}
