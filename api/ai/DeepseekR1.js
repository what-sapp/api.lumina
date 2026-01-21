const axios = require('axios')

async function deepseekR1(text) {
  try {
    const r = await axios.get('https://api.nekolabs.web.id/text.gen/cf/deepseek-r1', {
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
  name: "DeepSeekR1",
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

    const result = await deepseekR1(text)

    if (!result.success) {
      return res.status(500).json(result)
    }

    const fullResult = result.result
    
    // Logika untuk memisahkan isi <think> dengan jawaban utama
    let thought = ""
    let answer = fullResult

    if (fullResult.includes('<think>')) {
      const parts = fullResult.split('</think>')
      thought = parts[0].replace('<think>', '').trim()
      answer = parts[1] ? parts[1].trim() : ""
    }

    res.status(200).json({
      status: true,
      query: text,
      data: {
        thought: thought, // Proses berpikir AI
        answer: answer,   // Jawaban akhir untuk user
        raw_result: fullResult
      },
      timestamp: result.timestamp
    })
  }
}
