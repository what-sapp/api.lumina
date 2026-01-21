module.exports = {
  name: "YouTubeThumbnail",
  desc: "Get YouTube thumbnail images by video URL",
  category: "Downloader",
  params: ["url"],

  async run(req, res) {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({
        status: false,
        error: "YouTube URL is required"
      });
    }

    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/
    );

    if (!match) {
      return res.status(400).json({
        status: false,
        error: "Invalid YouTube URL"
      });
    }

    const id = match[1];

    res.status(200).json({
      status: true,
      video_id: id,
      thumbnails: {
        maxres: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        sd: `https://img.youtube.com/vi/${id}/sddefault.jpg`,
        hq: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        mq: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
        default: `https://img.youtube.com/vi/${id}/default.jpg`
      }
    });
  }
};
