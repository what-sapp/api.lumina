const axios = require('axios');
const cheerio = require('cheerio');

/**
 * TIKTOK USER FINDER / STALKER
 * Credits: AgungDEV
 * Params: q (Username)
 */
module.exports = {
    name: "TikTok Stalk",
    desc: "Mendapatkan informasi lengkap profil TikTok (Followers, Bio, Likes, dll)",
    category: "TOOLS",
    params: ["q"],
    async run(req, res) {
        try {
            const { q } = req.query;
            if (!q) return res.status(400).json({ status: false, error: "Username-nya mana mang?" });

            const cleanUsername = q.replace(/^@/, '').trim();
            const url = `https://www.tiktok.com/@${cleanUsername}`;

            const { data: html } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Referer': 'https://www.tiktok.com/'
                }
            });

            const $ = cheerio.load(html);
            const scriptData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
            
            if (!scriptData) throw new Error('Struktur data TikTok berubah atau user tidak ditemukan.');

            const parsed = JSON.parse(scriptData);
            const userDetail = parsed.__DEFAULT_SCOPE__?.['webapp.user-detail'];
            const userInfo = userDetail?.userInfo;

            if (!userInfo || !userInfo.user) throw new Error('User tidak ditemukan atau akun di-private.');

            res.status(200).json({
                status: true,
                creator: "shannz",
                owners: "AgungDEV",
                result: {
                    user: {
                        id: userInfo.user.id,
                        username: userInfo.user.uniqueId,
                        nickname: userInfo.user.nickname,
                        avatar: userInfo.user.avatarLarger,
                        bio: userInfo.user.signature,
                        verified: userInfo.user.verified,
                        region: userInfo.user.region
                    },
                    stats: {
                        followers: userInfo.stats.followerCount,
                        following: userInfo.stats.followingCount,
                        hearts: userInfo.stats.heartCount,
                        videos: userInfo.stats.videoCount,
                        friends: userInfo.stats.friendCount
                    }
                }
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
