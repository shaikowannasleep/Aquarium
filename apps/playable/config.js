/**
 * DinDun Playable Ads Hub - Configuration & Game Library
 * Interactive Device Simulator for HTML5 / WebGL Playable Ads
 * 
 * Special thanks to minhtq.dev for the playable previewer architecture inspiration.
 */
const APP_CONFIG = {
    // Header content
    title: 'DinDun Playable Ads Hub',
    subtitle: 'Interactive Device Simulator · Unity Luna & HTML5 WebGL',

    // Attribution & Inspiration
    credit: {
        author: 'minhtq.dev',
        url: 'https://playable.minhtq.dev/',
        note: 'Special thanks to minhtq.dev for the playable previewer architecture inspiration.'
    },

    // Total games / versions shown in the header
    stats: {
        enabled: true,
        gamesLabel: 'Games',
        versionsLabel: 'Versions'
    },

    // Where the playable builds live in directory storage
    paths: {
        directPrefix: './playable/category'
    },

    // Default tab
    defaultCategory: 'all',

    // Show game count on every tab
    showCategoryCount: true,

    // Hide empty tabs
    hideEmptyCategories: false,

    categories: [
        { key: 'all', label: 'All' },
        { key: 'playable', label: 'Playable Ads' },
        { key: 'casual', label: 'Casual' },
        { key: 'puzzle', label: 'Puzzle' },
        { key: 'action', label: 'Action' },
        { key: 'simulation', label: 'Simulation' }
    ],

    // Games directory catalog: files are stored in ./playable/category/<folder>/<version>.html
    games: [
        {
            folder: 'puzzle-screwout',
            name: 'ScrewOut V32 (Physics & Screws)',
            category: 'puzzle',
            versions: ['v1']
        },
        {
            folder: 'casual-lumen',
            name: 'Lumen (Luna / WebGL Playable)',
            category: 'casual',
            versions: ['v1']
        },
        {
            folder: 'casual-garan',
            name: 'Gà Rán & Bơ Già Dừa Non',
            category: 'casual',
            versions: ['v1']
        },
        {
            folder: 'action-abyss',
            name: 'Abyssal Dive (Flow-field & Boids)',
            category: 'action',
            versions: ['v1']
        },
        {
            folder: 'sim-aquarium',
            name: 'Aquarium Living Simulation',
            category: 'simulation',
            versions: ['v1']
        }
    ]
};
