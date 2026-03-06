const axios = require('axios');

/**
 * MELOLO SEARCH
 * GET /drama/melolo-search?query=ceo
 * GET /drama/melolo-search?query=ceo&offset=0&limit=10
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
    'Host':                    'api.tmtreader.com',
    'Accept':                  'application/json; charset=utf-8,application/x-protobuf',
    'X-Xs-From-Web':           'false',
    'Age-Range':               '8',
    'Sdk-Version':             '2',
    'Passport-Sdk-Version':    '50357',
    'X-Vc-Bdturing-Sdk-Version': '2.2.1.i18n',
    'User-Agent':              'ScRaPe/9.9 (KaliLinux; Nusantara Os; My/Shannz)',
};

const commonParams = () => ({
    iid:                    generateRandomId(19),
    device_id:              generateRandomId(19),
    ac:                     'wifi',
    channel:                'gp',
    aid:                    '645713',
    app_name:               'Melolo',
    version_code:           '49819',
    version_name:           '4.9.8',
    device_platform:        'android',
    os:                     'android',
    ssmix:                  'a',
    device_type:            'ScRaPe',
    device_brand:           'Shannz',
    language:               'in',
    os_api:                 '28',
    os_version:             '15',
    openudid:               generateOpenUdid(),
    manifest_version_code:  '49819',
    resolution:             '900*1600',
    dpi:                    '320',
    update_version_code:    '49819',
    current_region:         'ID',
    carrier_region:         'ID',
    app_language:           'id',
    sys_language:           'in',
    app_region:             'ID',
    sys_region:             'ID',
    mcc_mnc:                '46002',
    carrier_region_v2:      '460',
    user_language:          'id',
    time_zone:              'Asia/Jakarta',
    ui_language:            'in',
    cdid:                   generateUUID(),
    _rticket:               String(Math.floor(Date.now() * 1000) + Math.floor(Math.random() * 1000)),
});

module.exports = {
    name:     'MeloloSearch',
    desc:     'Cari short drama di Melolo (Worldance Drama) berdasarkan kata kunci.',
    category: 'Drama',
    params:   ['query'],

    async run(req, res) {
        const { query, offset = 0, limit = 10 } = req.query;
        if (!query?.trim()) return res.status(400).json({
            status: false, creator: 'Shannz',
            error: "Parameter 'query' wajib diisi. Contoh: ?query=ceo"
        });

        try {
            const { data: json } = await axios.get(`${BASE_URL}/i18n_novel/search/page/v1/`, {
                headers: HEADERS,
                params: {
                    ...commonParams(),
                    search_source_id:              'clks###',
                    IsFetchDebug:                  'false',
                    cancel_search_category_enhance:'false',
                    search_id:                     '',
                    query:                         query.trim(),
                    offset:                        Number(offset),
                    limit:                         Number(limit),
                },
                timeout: 15000,
            });

            const searchData = json?.data?.search_data || [];
            const results = [];

            if (Array.isArray(searchData)) {
                searchData.forEach(section => {
                    if (Array.isArray(section.books)) {
                        section.books.forEach(book => {
                            results.push({
                                title:          book.book_name,
                                book_id:        book.book_id,
                                cover:          book.thumb_url,
                                author:         book.author,
                                sinopsis:       book.abstract,
                                status:         book.show_creation_status,
                                tags:           book.stat_infos || [],
                                total_chapters: book.serial_count || book.last_chapter_index,
                            });
                        });
                    }
                });
            }

            return res.status(200).json({
                status: true, creator: 'Shannz',
                result: {
                    query:  query.trim(),
                    total:  results.length,
                    offset: Number(offset),
                    limit:  Number(limit),
                    data:   results,
                }
            });
        } catch (e) {
            return res.status(500).json({ status: false, creator: 'Shannz', error: e.message });
        }
    }
};
