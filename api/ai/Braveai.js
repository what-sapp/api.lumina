const axios = require('axios')

async function braveChat(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/brave-chat', {
      params: { text },
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
  name: "BraveAI",
  desc: "JSON Respone | Realtime",
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

    const result = await braveChat(text)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    // Mengambil data utama dari struktur JSON Brave
    const aiResponse = result.result.response
    const webResults = result.result.metadata.web.results || []

    // Memetakan sumber pencarian agar lebih rapi
    const sources = webResults.map(item => ({
      title: item.title,
      url: item.url,
      snippet: item.description
    }))

    res.status(200).json({
      status: true,
      query: text,
      data: {
        answer: aiResponse.trim(),
        sources: sources, // Menampilkan referensi link pencarian
        id: result.result.id
      }
    })
  }
}
