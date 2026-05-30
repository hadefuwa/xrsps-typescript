import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'XRSPS',
    description: 'OSRS in the browser — player guides and developer documentation',
    base: '/xrsps-typescript/',
    head: [
        ['meta', { property: 'og:title', content: 'XRSPS' }],
        ['meta', { property: 'og:description', content: 'OSRS in the browser — player guides and developer docs' }],
        ['meta', { name: 'theme-color', content: '#4a9eff' }],
    ],
    themeConfig: {
        logo: '/xrsps.png',
        siteTitle: false,
        nav: [
            { text: 'Home', link: '/' },
            {
                text: 'Players',
                items: [
                    { text: 'Getting Started', link: '/players/getting-started' },
                    { text: 'What Works', link: '/players/what-works' },
                    { text: 'Connecting (LAN / Tailscale)', link: '/players/connecting' },
                    { text: 'Plugins & Sidebar', link: '/players/plugins' },
                ],
            },
            {
                text: 'Developers',
                items: [
                    { text: 'Setup', link: '/setup' },
                    { text: 'Architecture', link: '/ARCHITECTURE' },
                    { text: 'Code Layers', link: '/dev/code-layers' },
                    { text: 'Adding Content', link: '/dev/adding-content' },
                    { text: 'AI Testing Guide', link: '/dev/ai-testing-guide' },
                    { text: 'Bot Testing', link: '/dev/bot-testing' },
                    { text: 'Dev Tools (F1)', link: '/dev/dev-tools' },
                    { text: 'Settings Persistence', link: '/dev/settings-persistence' },
                    { text: 'Known Bugs', link: '/dev/known-bugs' },
                    { text: 'Gamemodes', link: '/gamemodes' },
                    { text: 'Extrascripts', link: '/extrascripts' },
                    { text: 'FAQ', link: '/faq' },
                ],
            },
        ],
        sidebar: {
            '/players/': [
                {
                    text: 'Players',
                    items: [
                        { text: 'Getting Started', link: '/players/getting-started' },
                        { text: 'What Works', link: '/players/what-works' },
                        { text: 'Connecting (LAN / Tailscale)', link: '/players/connecting' },
                        { text: 'Plugins & Sidebar', link: '/players/plugins' },
                    ],
                },
            ],
            '/dev/': [
                {
                    text: 'Developer Guides',
                    items: [
                        { text: 'Code Layers', link: '/dev/code-layers' },
                        { text: 'Adding Content', link: '/dev/adding-content' },
                        { text: 'AI Testing Guide', link: '/dev/ai-testing-guide' },
                        { text: 'Bot Testing', link: '/dev/bot-testing' },
                        { text: 'Dev Tools (F1)', link: '/dev/dev-tools' },
                        { text: 'Settings Persistence', link: '/dev/settings-persistence' },
                        { text: 'Known Bugs', link: '/dev/known-bugs' },
                    ],
                },
                {
                    text: 'Reference',
                    items: [
                        { text: 'Setup', link: '/setup' },
                        { text: 'Architecture', link: '/ARCHITECTURE' },
                        { text: 'Gamemodes', link: '/gamemodes' },
                        { text: 'Extrascripts', link: '/extrascripts' },
                        { text: 'FAQ', link: '/faq' },
                    ],
                },
            ],
            '/': [
                {
                    text: 'Getting Started',
                    items: [
                        { text: 'Setup', link: '/setup' },
                        { text: 'FAQ', link: '/faq' },
                    ],
                },
                {
                    text: 'Documentation',
                    items: [
                        { text: 'Architecture', link: '/ARCHITECTURE' },
                        { text: 'Gamemodes', link: '/gamemodes' },
                        { text: 'Extrascripts', link: '/extrascripts' },
                    ],
                },
            ],
        },
        socialLinks: [
            { icon: 'discord', link: 'https://discord.gg/3dzttF2q73' },
            { icon: 'github', link: 'https://github.com/hadefuwa/xrsps-typescript' },
        ],
        footer: {
            message: 'Fan project. Not affiliated with Jagex Ltd.',
        },
        editLink: {
            pattern: 'https://github.com/hadefuwa/xrsps-typescript/edit/main/docs/:path',
            text: 'Edit this page on GitHub',
        },
    },
});
