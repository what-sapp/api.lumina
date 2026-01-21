const axios = require('axios')

async function writecreamAI(text, logic = 'lohic') {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/writecream', {
      params: { 
        text: text,
        logic: logic 
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
  name: "WritecreamAI",
  desc: "JSON Response | GPT Based",
  category: "AI",
  params: ["text", "logic"],

  async run(req, res) {
    const text = req.query.text
    const logic = req.query.logic || 'logic' // default logic
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Parameter 'text' is required"
      })
    }

    const result = await writecreamAI(text, logic)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    res.status(200).json({
      status: true,
      query: text,
      logic: logic,
      data: {
        answer: result.result.trim(),
        timestamp: result.timestamp,
        responseTime: result.responseTime
      }
    })
  }
}
