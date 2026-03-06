const axios = require('axios');

/**
 * MELOLO STREAM
 * GET /drama/melolo-stream?video_id=7543312165004905473
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
    'X-Ss-Stub':                 'B7FB786F2CAA8B9EFB7C67A524B73AFB',
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
    name:     'MeloloStream',
    desc:     'Ambil URL stream episode dari Melolo berdasarkan video_id.',
    category: 'Drama',
    params:   ['video_id'],

    async run(req, res) {
        const { video_id } = req.query;
        if (!video_id?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'video_id' wajib diisi. Contoh: ?video_id=7543312165004905473"
        });

        try {
            const { data: json } = await axios.post(
                `${BASE_URL}/novel/player/video_model/v1/`,
                {
                    biz_param: {
                        detail_page_version:       0,
                        device_level:              3,
                        from_video_id:             '',
                        need_all_video_definition: true,
                        need_mp4_align:            false,
                        source:                    4,
                        use_os_player:             false,
                        video_id_type:             0,
                        video_platform:            3,
                    },
                    video_id: video_id.trim(),
                },
                {
                    headers: HEADERS,
                    params:  commonParams(),
                    timeout: 15000,
                }
            );

            const raw = json?.data || {};
            if (!raw.main_url && !raw.video_model) {
                return res.status(404).json({ status: false, creator: 'Shannz', error: 'Stream tidak ditemukan.' });
            }

            const result = {
                url:        raw.main_url,
                backup_url: raw.backup_url,
                expire_at:  raw.expire_time,
                width:      raw.video_width,
                height:     raw.video_height,
                metadata:   {},
                downloads:  [],
            };

            try {
                if (raw.video_model) {
                    const model  = JSON.parse(raw.video_model);
                    const thumbs = model.big_thumbs || [];

                    result.metadata = {
                        id:        model.video_id,
                        duration:  model.video_duration,
                        thumbnail: thumbs.length > 0 ? thumbs[0].img_url : null,
                    };

                    if (model.video_list) {
                        Object.values(model.video_list).forEach(item => {
                            let videoUrl = item.main_url;
                            if (videoUrl && !videoUrl.startsWith('http')) {
                                try {
                                    videoUrl = Buffer.from(videoUrl, 'base64').toString('utf-8');
                                } catch (_) {}
                            }
                            result.downloads.push({
                                quality: item.definition,
                                size:    item.size,
                                fps:     item.fps,
                                url:     videoUrl,
                            });
                        });
                        result.downloads.sort((a, b) => b.size - a.size);
                    }
                }
            } catch (e) {
                result.parse_error = 'Failed to parse video model';
            }

            return res.status(200).json({ status: true, creator: 'Shannz', result });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};

