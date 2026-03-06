const axios = require('axios');

/**
 * MELOLO DETAIL
 * GET /drama/melolo-detail?book_id=7543217293895928848
 */

const generateRandomId = (length = 19) => {
    let result = String(Math.floor(Math.random() * 9) + 1);
    for (let i = 1; i < length; i++) result += Math.floor(Math.random() * 10);
    return result;
};

const generateOpenUdid = () =>
    'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));

const generateUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });

const BASE_URL = 'https://api.tmtreader.com';

const HEADERS = {
    'Host':                      'api.tmtreader.com',
    'Accept':                    'application/json; charset=utf-8,application/x-protobuf',
    'X-Xs-From-Web':             'false',
    'Age-Range':                 '8',
    'Sdk-Version':               '2',
    'Passport-Sdk-Version':      '50357',
    'X-Vc-Bdturing-Sdk-Version': '2.2.1.i18n',
    'User-Agent':                'ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)',
    'X-Ss-Stub':                 '238B6268DE1F0B757306031C76B5397E',
    'Content-Type':              'application/json; charset=utf-8',
};

const commonParams = () => ({
    iid:                   generateRandomId(19),
    device_id:             generateRandomId(19),
    ac:                    'wifi',
    channel:               'gp',
    aid:                   '645713',
    app_name:              'Melolo',
    version_code:          '49819',
    version_name:          '4.9.8',
    device_platform:       'android',
    os:                    'android',
    ssmix:                 'a',
    device_type:           'ScRaPe',
    device_brand:          'Shannz',
    language:              'in',
    os_api:                '28',
    os_version:            '15',
    openudid:              generateOpenUdid(),
    manifest_version_code: '49819',
    resolution:            '900*1600',
    dpi:                   '320',
    update_version_code:   '49819',
    current_region:        'ID',
    carrier_region:        'ID',
    app_language:          'id',
    sys_language:          'in',
    app_region:            'ID',
    sys_region:            'ID',
    mcc_mnc:               '46002',
    carrier_region_v2:     '460',
    user_language:         'id',
    time_zone:             'Asia/Jakarta',
    ui_language:           'in',
    cdid:                  generateUUID(),
    _rticket:              String(Math.floor(Date.now() * 1000) + Math.floor(Math.random() * 1000)),
});

module.exports = {
    name:     'MeloloDetail',
    desc:     'Detail short drama di Melolo beserta daftar episode.',
    category: 'Drama',
    params:   ['book_id'],

    async run(req, res) {
        const { book_id } = req.query;
        if (!book_id?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'book_id' wajib diisi. Contoh: ?book_id=7543217293895928848"
        });

        try {
            const { data: json } = await axios.post(
                `${BASE_URL}/novel/player/video_detail/v1/`,
                {
                    biz_param: {
                        detail_page_version:      0,
                        from_video_id:            '',
                        need_all_video_definition:false,
                        need_mp4_align:           false,
                        source:                   4,
                        use_os_player:            false,
                        video_id_type:            1,
                    },
                    series_id: book_id.trim(),
                },
                {
                    headers: HEADERS,
                    params:  commonParams(),
                    timeout: 15000,
                }
            );

            const data = json?.data?.video_data || {};
            if (!data.series_id_str && !data.series_title) {
                return res.status(404).json({ status: false, creator: 'Shannz', error: 'Drama tidak ditemukan.' });
            }

            // Parse tags
            let tags = [];
            try {
                if (data.category_schema) {
                    tags = JSON.parse(data.category_schema).map(cat => cat.name);
                }
            } catch (_) {}

            // Episode list
            const episodes = (data.video_list || []).map(v => ({
                video_id: v.vid,
                episode:  v.vid_index,
                title:    v.title,
                duration: v.duration,
                likes:    v.digged_count,
                cover:    v.cover,
            }));

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    book_id:        data.series_id_str || book_id.trim(),
                    title:          data.series_title,
                    intro:          data.series_intro,
                    cover:          data.series_cover,
                    total_episodes: data.episode_cnt,
                    status:         data.series_status === 1 ? 'Ongoing' : 'Completed',
                    tags,
                    episodes,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
