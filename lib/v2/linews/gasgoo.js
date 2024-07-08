const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const baseUrl = 'https://auto.gasgoo.com';
    const response = await got({
        method: 'get',
        url: 'https://auto.gasgoo.com/auto-news/C-103-106-107-108-109-110-303-409-501-601',
    });

    // 获取列表
    const $ = cheerio.load(response.data);
    const list = $('.contentList')
        .toArray()
        .map((element) => {
            const title = $(element).find('.bigtitle a').text().trim();
            const link = baseUrl + $(element).find('.bigtitle a').attr('href');
            const image = $(element).find('dt a img').attr('src');
            const description = $(element).find('.details').text().trim();
            const time = $(element).find('.authorThumbs .time').text().trim();
            return {
                title,
                description,
                pubDate: new Date(time),
                link,
                guid: link,
                image,
            };
        });

    // 获取全文
    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const response = await got({
                    method: 'get',
                    url: item.link,
                });

                const $ = cheerio.load(response.data);
                item.description = $('.contentDetailed').html() || item.description;
                return item;
            })
        )
    );

    ctx.state.data = {
        title: '盖世汽车资讯',
        link: 'https://auto.gasgoo.com/auto-news/C-103-106-107-108-109-110-303-409-501-601',
        description: '盖世汽车新闻资讯-我们实时提供:最新汽车销量数据、最新汽车新闻、汽车行业新闻以及汽车新闻头条等.是您了解汽车的第一渠道.',
        item: items,
    };
};
