const got = require('@/utils/got');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { CookieJar } = require('tough-cookie');

module.exports = async (ctx) => {
    const baseUrl = 'https://www.dongchedi.com';
    const response = await got({
        method: 'get',
        url: 'https://www.dongchedi.com/news',
    });

    // 获取列表
    const $ = cheerio.load(response.data);
    const list = $('.common-card_wrapper__Inr_n')
        .toArray()
        .map((element) => {
            const title = $(element).find('a').attr('title');
            const link = baseUrl + $(element).find('a').attr('href');
            const image = $(element).find('img').attr('src');
            const author = $(element).find('.author-avatar_name__3ex3- a').text();
            const timeAgo = $(element).find('span:last-child').text().trim();

            // timeAgo可能为: 'n分钟前', 'n小时前', '昨天 15:28', '前天 22:52', 'n天前', '6月28'
            let time = new Date();
            if (timeAgo.includes('分钟前')) {
                const minutes = Number.parseInt(timeAgo, 10);
                time = new Date(Date.now() - minutes * 60 * 1000);
            } else if (timeAgo.includes('小时前')) {
                const hours = Number.parseInt(timeAgo, 10);
                time = new Date(Date.now() - hours * 60 * 60 * 1000);
            } else if (timeAgo.includes('昨天')) {
                const [, timeStr] = timeAgo.split(' ');
                time = new Date(`${timeStr}T00:00:00+08:00`);
            } else if (timeAgo.includes('前天')) {
                const [, timeStr] = timeAgo.split(' ');
                time = new Date(`${timeStr}T00:00:00+08:00`);
            } else if (timeAgo.includes('天前')) {
                const days = Number.parseInt(timeAgo, 10);
                time = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            } else if (timeAgo.includes('月')) {
                const [month, day] = timeAgo.split('月');
                time = new Date(`${month}-${day}`);
            }

            return {
                title,
                pubDate: time,
                link,
                guid: link,
                author,
                image,
            };
        });

    // 获取全文
    const cookieJar = new CookieJar();
    const items = await Promise.all(
        list
            .filter((item) => item.link.includes('/article/'))
            .map(async (item) => {
                // 懂车帝详情页面打开规则：
                // 1.首先获取到的是一段JS代码，并且带有__ac_nonce
                // 2.浏览器收到以后，会执行JS代码，根据__ac_nonce计算出__ac_signature
                // 3.浏览器带上__ac_nonce + __ac_signature + __ac_referer重新访问
                // 4.这次获得的就是详情页面
                const response = await got(item.link, {
                    cookieJar,
                });
                new JSDOM(response.data, {
                    runScripts: 'dangerously',
                    cookieJar,
                });

                // 再次请求
                const response2 = await got(item.link, {
                    cookieJar,
                });
                const $ = cheerio.load(response2.data);
                const content = $('.article-content').html();
                item.description = content || item.description;
                return item;
            })
    );

    ctx.state.data = {
        title: '最新汽车资讯_资讯_懂车帝',
        link: 'https://www.dongchedi.com/',
        description: '懂车帝资讯频道提供最新最全的汽车资讯,汽车行情,汽车科技新闻,汽车文化,试驾测评,用车知识,热点活动与车展赛事等汽车信息。',
        item: items,
    };
};
