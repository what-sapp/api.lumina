// api/search.js
import axios from 'axios';

const VPS_BASE = 'http://13.70.109.60:1072'; // IP VPS kamu + port publik

export default {
  name: 'VPS Search',
  desc: 'Search doujins from VPS nHentai Scraper',
  category: 'nHentai',
  params: ['q', 'page'],
  async run(req, res) {
    try {
      if (req.method !== 'GET') {
        return res.status(405).json({ status: false, error: 'Method not allowed' });
      }

      const { q, page = 1 } = req.query;

      if (!q) {
        return res.status(400).json({ status: false, error: "Parameter 'q' is required" });
      }

      // Panggil VPS
      const endpoint = `${VPS_BASE}/search?q=${encodeURIComponent(q)}&page=${page}`;
      const { data } = await axios.get(endpoint, { timeout: 15000 });

      // Kirim hasil ke frontend dengan format scraper
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
