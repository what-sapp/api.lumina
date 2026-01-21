const axios = require('axios')

async function nekolabs(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/ai4chat', {
      params: { text },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'application/json'
      }
    })

    // API ini mengembalikan JSON langsung, jadi tidak perlu stream parsing
    return r.data
  } catch (e) {
    return { 
      success: false, 
      error: e.message 
    }
  }
}

module.exports = {
  name: "Ai4Chat",
  desc: "JSON Respone | GPT Based",
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

    const result = await nekolabs(text)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    // Mengirimkan hasil JSON sesuai format asli API-nya
    res.status(200).json(result)
  }
}
