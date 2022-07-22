module.exports = {
    title: '程序猿进阶',                 // 网站的标题，还会显示在导航栏的左上角
    // port: "3000",
    dest: 'docs/.vuepress/dist',        // 保存 vuepress build 构建结果的目录
    // ga: "UA-xxxxx-1",
    base: "/",                          // 该 VuePress 网站监听的 URL 的起始路径，会成为以 / 开始的其它 URL 的前缀
    markdown: {
        lineNumbers: true,              // 让代码块显示行号
        extractHeaders: ['h2', 'h3'],   // 从 MarkDown 文档中提取哪几级标题，保存到 this.$page.headers
        toc: { includeLevel: [2, 3] },  // MarkDown 文档中，用 [[toc]] 标签建立目录时，收集哪几级标题
        // externalLinks: {
        //     target: '_blank', rel: 'noopener noreferrer'
        // },
        // 侧边栏深度配置
        // extractHeaders: ['h2', 'h3', 'h4', 'h5', 'h6']
    },
    locales: {
        "/": {
            lang: "zh-CN",
            title: "程序员进阶",            
            description: "祸兮福所依，福兮祸所伏"
        }
    },
    head: [
        // ico
        ["link", {rel: "icon", href: `/favicon.ico`}],
        // meta
        ["meta", {name: "robots", content: "all"}],
        ["meta", {name: "author", content: "zzx"}],
        ["meta", {name: "keywords", content: "Java 全栈知识体系, java体系, java知识体系, java框架,java详解,java学习路线,java spring, java面试, 知识体系, java技术体系, java编程, java编程指南,java开发体系, java开发,java教程,java,java数据结构, 算法, 开发基础"}],
        ["meta", {name: "apple-mobile-web-app-capable", content: "yes"}]
    ],
    plugins: [
        ['@vssue/vuepress-plugin-vssue', {
            // 设置 `platform` 而不是 `api`
            platform: 'github',

            // 其他的 Vssue 配置
            owner: 'OWNER_OF_REPO',
            repo: 'NAME_OF_REPO',
            clientId: 'YOUR_CLIENT_ID',
            clientSecret: 'YOUR_CLIENT_SECRET',
        }],
        ['copyright', {
            noCopy: true, // 选中的文字将无法被复制
            minLength: 100, // 如果长度超过 100 个字符
        }],
        ['sitemap', {
            hostname: 'https://pro.tech'
        }],
        [['vuepress-plugin-code-copy', true]],
        ['@vuepress/back-to-top', true],
        ['@vuepress/medium-zoom', {
            selector: 'img',
            // See: https://github.com/francoischalifour/medium-zoom#options
            options: {
                margin: 16
            }
        }],
        ['vuepress-plugin-baidu-autopush']
    ],
    themeConfig: {
        // repo: "ProgrammerAdvanced/blog",    // 启用到 GitHub 仓库的链接，显示在页面右上角
        docsRepo: "docs",                   // 使用 GitHub 仓库中哪个目录下的文档
        // logo: "/logo.png",               // 网站 logo ，会显示在导航栏的左侧
        // editLinks: true,                 // 启用快速编辑的链接，显示在文章末尾的左下角
        // sidebarDepth:0,
        sidebar: {                          // 侧边栏
            '/blogs/qmq/kafka/': [
                // {
                //     title: '目录',
                //     children: [
                //         'Kafka生产者写入数据'
                //     ]
                // },
                {
                    title: '消息中间件',
                    children: [
                        'Kafka生产者写入数据',
                        'Kafka消费者读取数据'
                    ]
                }
            ]
        },
        // 右上目录
        nav: [
            { text: '首页', link: '/'},
            { text: '面试', link: '/blogs/interview/缓存'},
            { text: '缓存', 
                items: [
                    { text: 'html', link: '/'},
                    { text: 'css', link: '/'}
                ]
            },
            { text: '消息中间件', 
            items: [
                { text: 'html', link: '/'},
                { text: 'css', link: '/'}
            ]
        }
        ],
        // locales: {
        //     "/": {
        //         label: "简体中文",
        //         selectText: "Languages",
        //         editLinkText: "在 GitHub 上编辑此页",
        //         lastUpdated: "上次更新",
        //         nav: [
        //         ],
        //         sidebar: {
        //         }
        //     }
        // }
    }
};
