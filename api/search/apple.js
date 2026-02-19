const axios = require('axios');

/**
 * HELPER: Formatter URL Apple Music
 */
function toAppleMusicUrl(trackViewUrl, trackId) {
    if (!trackViewUrl) return null;
    try {
        const u = new URL(trackViewUrl);
        const origin = 'https://music.apple.com';
        const path = u.pathname;
        const params = new URLSearchParams();
        if (trackId) params.set('i', String(trackId));
        params.set('uo', '4');
        return `${origin}${path}?${params.toString()}`;
    } catch {
        return null;
    }
}

/**
 * EXPORT MODULE
 */
module.exports = {
    name: "Apple Music Search",
    desc: "Mencari lagu, preview, dan link official dari Apple Music / iTunes",
    category: "SEARCH", 
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    status: false,
                    error: 'Parameter "q" (judul lagu) wajib diisi!'
                });
            }

            console.log(`Searching Apple Music for: ${q}`);

            const response = await axios.get('https://itunes.apple.com/search', {
                params: {
                    term: q,
                    media: 'music',
                    entity: 'song',
                    limit: 10 // Saya naikkan limitnya ke 10 biar lebih puas
                }
            });

            const songs = (response.data.results || []).map(item => ({
                trackId: item.trackId || null,
                title: item.trackName || null,
                artist: item.artistName || null,
                album: item.collectionName || null,
                genre: item.primaryGenreName || null,
                releaseDate: item.releaseDate || null,
                thumbnail: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : null, // High res cover
                previewUrl: item.previewUrl || null,
                appleUrl: toAppleMusicUrl(item.trackViewUrl, item.trackId) || item.trackViewUrl || null
            }));

            if (songs.length === 0) {
                return res.status(404).json({
                    status: false,
                    error: "Lagu tidak ditemukan."
                });
            }

            res.status(200).json({
                status: true,
                creator: "shannz",
                result: songs
            });

        } catch (error) {
            res.status(500).json({
                status: false,
                creator: "shannz",
                error: error.message
            });
        }
    }
};
