const axios = require('axios')

async function resolveRedirect(url) {
  const r = await axios.get(url, {
    maxRedirects: 5,
    validateStatus: null
  })
  return r.request.res.responseUrl
}

module.exports = {
  name: "RednoteDownloader",
  desc: "Download Rednote / Xiaohongshu video",
  category: "Downloader",
  params: ["url"],

  async run(req, res) {
    let url = req.query.url
    if (!url) return res.json({ status: false, error: "url is required" })

    try {
      if (url.includes('xhslink.com')) {
        url = await resolveRedirect(url)
      }

      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })

      const match = html.match(
        /<script[^>]+type="application\/json"[^>]*>(.*?)<\/script>/s
      )

      if (!match) {
        return res.json({
          status: false,
          error: "JSON data not found"
        })
      }

      const json = JSON.parse(match[1])

      const note = json?.data?.note
      const video =
        note?.video?.media?.stream?.h264 ||
        note?.video?.media?.stream?.h265

      if (!video) {
        return res.json({
          status: false,
          error: "Video not found"
        })
      }

      const urls = Object.values(video)
        .map(v => v?.masterUrl)
        .filter(Boolean)

      res.json({
        status: true,
        title: note.title,
        author: note.user.nickname,
        video: urls[0],
        all_quality: urls
      })

    } catch (e) {
      res.json({ status: false, error: e.message })
    }
  }
}
