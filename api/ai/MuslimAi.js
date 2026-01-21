const axios = require('axios')

async function muslimAI(text) {
  try {
    const r = await axios.get('https://labs.shannzx.xyz/api/v1/muslimai', {
      params: { query: text },
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
  name: "MuslimAI",
  desc: "JSON Response | Islamic AI based on Quran",
  category: "AI",
  params: ["query"],

  async run(req, res) {
    const query = req.query.query || req.query.text
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Parameter 'query' is required"
      })
    }

    const result = await muslimAI(query)

    if (result.success === false) {
      return res.status(500).json(result)
    }

    // Mengambil data dari response
    const answer = result.data.answer
    const sources = result.data.source || []

    // Memetakan sumber referensi Quran
    const references = sources.map(item => ({
      id: item.id,
      surah: item.surah_title,
      url: item.surah_url,
      content: item.content,
      similarity: item.similarity
    }))

    res.status(200).json({
      status: true,
      query: query,
      data: {
        answer: answer.trim(),
        references: references,
        total_sources: references.length
      }
    })
  }
}
