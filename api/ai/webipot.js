const axios = require('axios')

async function webpilot(q) {
  try {
    const r = await axios.post(
      'https://api.webpilotai.com/rupee/v1/search',
      { q, threadId: '' },
      {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Accept': 'application/json,text/plain,*/*,text/event-stream',
          'Content-Type': 'application/json',
          'Authorization': 'Bearer null',
          'Origin': 'https://www.webpilot.ai'
        }
      }
    )

    let text = ''
    let source = []

    return await new Promise((resolve) => {
      r.data.on('data', chunk => {
        const lines = chunk.toString().split('\n')
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const j = JSON.parse(line.slice(5).trim())
              if (j.type === 'data' && j.data?.content && !j.data.section_id) {
                text += j.data.content
              }
              if (j.action === 'using_internet' && j.data) {
                source.push(j.data)
              }
            } catch {}
          }
        }
      })

      r.data.on('end', () => {
        resolve({
          text: text.trim(),
          source
        })
      })
    })

  } catch (e) {
    return { error: e.message }
  }
}

module.exports = {
  name: "WebPilotSearch",
  desc: "Search via WebPilot AI (stream parsed)",
  category: "AI",
  params: ["q"],

  async run(req, res) {
    const q = req.query.q
    if (!q) {
      return res.status(400).json({
        status: false,
        error: "Query (q) is required"
      })
    }

    const result = await webpilot(q)

    if (result.error) {
      return res.status(500).json({
        status: false,
        error: result.error
      })
    }

    res.status(200).json({
      status: true,
      query: q,
      result
    })
  }
}
