// api/latest.js
const axios = require('axios');

const VPS_BASE = 'http://13.70.109.60:1072'; // IP VPS + port publik

module.exports = {
  name: 'VPS Latest',
  desc: 'Get latest doujins from VPS nHentai Scraper',
  category: 'nHentai',
  run: async function (req, res) {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: false, error: 'Method not allowed' });
      }

      // Panggil VPS langsung tanpa query params
      const endpoint = `${VPS_BASE}/latest`;
      const { data } = await axios.get(endpoint, { timeout: 15000 });

      // Kirim hasil ke frontend
      res.status(200).json({
        status: data.success ?? true,
        creator: 'robin',
        data: data.data ?? {}
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
