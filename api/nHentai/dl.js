// api/download.js
const axios = require('axios');

const VPS_BASE = 'http://13.70.109.60:1072'; // ganti sesuai VPS publik-mu

module.exports = {
  name: 'VPS Download',
  desc: 'Get all page URLs for a doujin chapter from VPS',
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

      // Panggil VPS chapter endpoint
      const endpoint = `${VPS_BASE}/chapter/${id}`;
      const { data } = await axios.get(endpoint, { timeout: 15000 });

      if (!data.success || !data.data?.pages) {
        return res.status(404).json({ status: false, error: 'Chapter not found or empty' });
      }

      // Kirim semua URL halaman ke frontend
      res.status(200).json({
        status: true,
        creator: 'robin',
        id: data.data.id,
        title: data.data.title,
        pages: data.data.pages // array URL per halaman
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
