const axios = require('axios');

/**
 * INSTAGRAM STALKER PRO (DEEP SCRAPE)
 * Feature: Profile Info, Posts History, & Analytics
 * Integration: Shannz x Xena
 */
module.exports = {
    name: "IG Stalk Pro",
    desc: "Stalking profil Instagram secara mendalam, ambil postingan, dan hitung statistik engagement.",
    category: "Social Media",
    params: ["username"],
    async run(req, res) {
        try {
            const { username } = req.query;
            if (!username) return res.status(400).json({ status: false, error: "Username-nya mana, Senior?" });

            const headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6833B)',
                'Accept': '*/*',
                'Referer': 'https://ig-profile-viewer.com/'
            };

            // --- TAHAP 1: FETCH PROFILE & RECENT POSTS ---
            const { data } = await axios.get(`https://ig-profile-viewer.com/api/profile-with-posts/${username}`, { headers });

            if (!data.profile) {
                return res.status(404).json({ status: false, error: "User tidak ditemukan atau akun privat!" });
            }

            const profile = data.profile;
            const posts = data.posts?.posts || [];

            // --- TAHAP 2: CALCULATE ANALYTICS (Engagement Rate) ---
            let totalLikes = 0;
            let totalComments = 0;
            posts.forEach(p => {
                totalLikes += (p.likes || 0);
                totalComments += (p.comments || 0);
            });

            const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
            const engagementRate = profile.followersCount > 0 
                ? ((avgLikes / profile.followersCount) * 100).toFixed(2) + '%' 
                : '0%';

            // --- FINAL RESPONSE ---
            res.status(200).json({
                status: true,
                creator: "shannz x Xena",
                result: {
                    user: {
                        username: profile.username,
                        fullname: profile.fullName,
                        bio: profile.bio,
                        followers: profile.followersCount,
                        following: profile.followingCount,
                        posts_count: profile.postsCount,
                        is_verified: profile.isVerified,
                        profile_pic: profile.profilePicUrl
                    },
                    stats: {
                        average_likes: avgLikes,
                        engagement_rate: engagementRate,
                        scraped_posts: posts.length
                    },
                    posts: posts.map(p => ({
                        id: p.shortcode,
                        type: p.type,
                        url: p.url,
                        caption: p.caption,
                        likes: p.likes,
                        comments: p.comments,
                        thumbnail: p.media?.[0]?.url || null,
                        timestamp: p.timestamp
                    }))
                }
            });

        } catch (error) {
            console.error('IG Stalk Error:', error.message);
            res.status(500).json({ status: false, error: "Server IG-Viewer sedang sibuk atau limit!" });
        }
    }
};
