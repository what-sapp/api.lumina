// api/download.js
const axios = require('axios');

const VPS_BASE = 'http://13.70.109.60:1072'; // ganti sesuai VPS publik-mu

module.exports = {
  name: 'VPS Download',
  desc: 'Get doujin download URL from VPS nHentai Scraper',
  category: 'nHentai',
  params: ['id'],
  run: async function (req, res) {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: false, error: 'Method not allowed' });
      }

      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ status: false, error: "Parameter 'id' is required" });
      }

      // Panggil VPS
      const endpoint = `${VPS_BASE}/download/${id}`;
      const { data } = await axios.get(endpoint, { timeout: 15000 });

      // Kirim URL download ke frontend
      res.status(200).json({
        status: data.success ?? true,
        creator: 'robin',
        url: data.path ?? null // path dari VPS adalah URL file
      });

    } catch (error) {
      res.status(500).json({
        status: false,
        creator: 'robin',
        error: error.message
      });
    }
  }
};
