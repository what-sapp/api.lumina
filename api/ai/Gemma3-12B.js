const axios = require('axios')

async function gemma3(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/cf/gemma-3-12b', {
      params: { text },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'application/json'
      }
    })
    return r.data
  } catch (e) {
    return { success: false, error: e.message }
  }
}

module.exports = {
  name: "Gemma3-12b",
  desc: "JSON Response | Cloudflare AI | LLM",
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

    const result = await gemma3(text)

    if (!result.success) {
      return res.status(500).json(result)
    }

    // Mengembalikan response yang cepat dan efisien
    res.status(200).json({
      status: true,
      query: text,
      answer: result.result,
      meta: {
        speed: result.responseTime,
        model: "Gemma-3-12B-It"
      }
    })
  }
}
