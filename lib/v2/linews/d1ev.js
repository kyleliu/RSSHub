const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const baseUrl = 'https://www.d1ev.com';
    const response = await got({
        method: 'get',
        url: 'https://www.d1ev.com/news',
    });

    // 获取列表
    const $ = cheerio.load(response.data);
    const list = $('.article--wraped')
        .toArray()
        .map((element) => {
            const title = $(element).find('.article_p a').text().trim();
            const link = baseUrl + $(element).find('.article_p a').attr('href');
            const image = $(element).find('.article--img img').attr('src');
            const time = $(element).find('.article--time time').attr('datetime');
            const author = $(element).find('.article--author a').text().trim();
            return {
                title,
                pubDate: new Date(time || ''),
                link,
                guid: link,
                author,
                image,
            };
        });

    // 获取全文
    const items = await Promise.all(
        list.map(async (item) => {
            const response = await got({
                method: 'get',
                url: item.link,
            });

            const $ = cheerio.load(response.data);
            item.description = $('#showall233').html() || item.description;
            return item;
        })
    );

    ctx.state.data = {
        title: '第一电动网',
        link: 'https://www.d1ev.com/',
        description: '资讯栏目每天对新能源电动汽车行业的新闻资讯第一时间报道,并且有专业的产业报道小组为您分析解读。',
        item: items,
    };
};
