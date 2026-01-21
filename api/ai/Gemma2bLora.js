const axios = require('axios')

async function gemmaLora(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/cf/gemma-2b-lora', {
      params: { text },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'Accept': 'application/json'
      },
      timeout: 60000 // Mengingat response time mencapai 22 detik, kita pasang timeout 60 detik
    })
    return r.data
  } catch (e) {
    return { success: false, error: e.message }
  }
}

module.exports = {
  name: "Gemma2BLora",
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

    const result = await gemmaLora(text)

    if (!result.success) {
      return res.status(500).json(result)
    }

    // Output bersih dan terstruktur
    res.status(200).json({
      status: true,
      query: text,
      result: result.result, // Isi teks jawaban
      info: {
        timestamp: result.timestamp,
        execution_time: result.responseTime
      }
    })
  }
}
