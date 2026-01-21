const axios = require('axios');

async function webpilot(q) {
  try {
    const r = await axios.post(
      'https://api.webpilotai.com/rupee/v1/search',
      { q: q, threadId: '' }, // threadId tetap kosong (required by API)
      {
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          Accept: 'application/json,text/plain,*/*,text/event-stream',
          'Content-Type': 'application/json',
          origin: 'https://www.webpilot.ai'
        }
      }
    );

    let text = '';
    let source = [];

    return await new Promise((done) => {
      r.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');

        for (let line of lines) {
          line = line.trim();
          if (!line.startsWith('data:')) continue;

          const raw = line.slice(5).trim();
          try {
            const j = JSON.parse(raw);

            if (j.type === 'data' && j.data?.content && !j.data.section_id) {
              text += j.data.content;
            }

            if (j.action === 'using_internet' && j.data) {
              source.push(j.data);
            }
          } catch {}
        }
      });

      r.data.on('end', () => {
        done({ text: text.trim(), source });
      });
    });
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = {
  name: "WebPilotSearch",
  desc: "Simple WebPilot streaming search (q only)",
  category: "Scraper",
  params: ["q"],

  async run(req, res) {
    try {
      const q = (req.query.q || req.body?.q || "").toString().trim();

      if (!q) return res.status(400).json({ status: false, error: 'q wajib' });

      const result = await webpilot(q);

      if (result.error) {
        return res.status(500).json({ status: false, error: result.error });
      }

      return res.json({
        status: true,
        query: q,
        result
      });
    } catch (err) {
      return res.status(500).json({ status: false, error: err.message });
    }
  }
};
