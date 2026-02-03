const axios = require("axios");
const cheerio = require("cheerio");

const MIME_TYPES = {
  "7z": "application/x-7z-compressed",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  apk: "application/vnd.android.package-archive",
  exe: "application/x-msdownload",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  txt: "text/plain",
  json: "application/json",
  js: "application/javascript",
  html: "text/html",
  css: "text/css",
};

module.exports = {
  name: "Mediafire Scraper",
  desc: "JSON Response | Scrape | Download Link",
  category: "Downloader",
  params: ["url"],
  async run(req, res) {
    try {
      const url = req.query.url;

      if (!url) {
        return res.status(400).json({
          status: false,
          error: "Parameter 'url' is required",
        });
      }

      if (!url.includes("mediafire.com")) {
        return res.status(400).json({
          status: false,
          error: "URL harus dari mediafire.com",
        });
      }

      const { data: html } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10)",
          Accept: "text/html",
        },
        timeout: 15000,
      });

      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr("content");
      const image = $('meta[property="og:image"]').attr("content");
      const description = $('meta[property="og:description"]').attr("content") || "No description";
      const downloadLink = $("#downloadButton").attr("href");
      const rawSize = $("#downloadButton").text().trim();
      const size = rawSize.replace("Download (", "").replace(")", "");

      if (!downloadLink) {
        return res.status(404).json({
          status: false,
          error: "Download link tidak ditemukan",
        });
      }

      const ext = downloadLink.split("/").pop().split("?")[0].split(".").pop().toLowerCase();
      const mimetype = MIME_TYPES[ext] || "unknown";

      res.status(200).json({
        status: true,
        data: {
          meta: { title, image, description },
          download: { link: downloadLink, size, mimetype },
        },
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        statusCode: 500,
        creator: "robin",
        error: error.message,
      });
    }
  },
};
