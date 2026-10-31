/**
 * DinDun Playable Ads Hub - Game List & Navigation Script
 * - Fast directory-based build loader
 * - Search & category filtering
 * - Security shield: Anti-ripping & shortcut protection
 * 
 * Special thanks to minhtq.dev for the playable previewer architecture inspiration.
 */

class GameListManager {
    constructor(config) {
        this.config = config;
        this.games = config.games || [];
        this.filteredGames = [...this.games];
        this.currentCategory = config.defaultCategory || 'all';
        this.currentSearch = '';
        this.currentVersionKey = '';

        this.elements = {
            headerTitle: document.getElementById('headerTitle'),
            headerSubtitle: document.getElementById('headerSubtitle'),
            headerStats: document.getElementById('headerStats'),
            brandLogo: document.getElementById('brandLogo'),
            categoryFilters: document.getElementById('categoryFilters'),
            resultCount: document.getElementById('resultCount'),
            themeToggle: document.getElementById('themeToggle'),
            gamesGrid: document.getElementById('gamesGrid'),
            noResults: document.getElementById('noResults'),
            searchInput: document.getElementById('searchInput'),
            stageEmpty: document.getElementById('stageEmpty'),
            securityBtn: document.getElementById('securityShieldBtn'),
            securityModal: document.getElementById('securityModal'),
            securityCloseBtn: document.getElementById('securityCloseBtn'),
            btnCopySecurity: document.getElementById('btnCopySecuritySnippet'),
            filterBtns: []
        };

        this.init();
    }

    init() {
        this.renderHeader();
        this.renderStats();
        this.renderCategoryFilters();
        this.setupEventListeners();
        this.setupSecurityShield();
        this.applyFilters();

        // Auto-select first game on desktop
        if (!this.isMobile() && this.filteredGames.length > 0) {
            const first = this.filteredGames[0];
            const base = (this.config.paths && this.config.paths.directPrefix) || './playable/category';
            const path = `${base}/${first.folder}/${first.versions[0]}.html`;
            const key = `${first.folder}/${first.versions[0]}`;
            this.playVersion(path, key);
        }
    }

    /* ------------------------------------------------------------------ *
     * Header & Stats
     * ------------------------------------------------------------------ */
    renderHeader() {
        if (this.elements.headerTitle && this.config.title) {
            this.elements.headerTitle.textContent = this.config.title;
            document.title = `${this.config.title} — Playable Ads Simulator`;
        }
        if (this.elements.headerSubtitle && this.config.subtitle) {
            this.elements.headerSubtitle.textContent = this.config.subtitle;
        }
    }

    getTotals(games = this.games) {
        return {
            games: games.length,
            versions: games.reduce((total, game) => total + (game.versions ? game.versions.length : 1), 0)
        };
    }

    renderStats() {
        const statsConfig = this.config.stats || {};
        if (!this.elements.headerStats || statsConfig.enabled === false) return;

        const totals = this.getTotals();
        this.elements.headerStats.innerHTML = `
            <div class="stat-chip">
                <span class="stat-value">${totals.games}</span>
                <span class="stat-label">${statsConfig.gamesLabel || 'Games'}</span>
            </div>
            <div class="stat-chip">
                <span class="stat-value">${totals.versions}</span>
                <span class="stat-label">${statsConfig.versionsLabel || 'Builds'}</span>
            </div>
        `;
    }

    /* ------------------------------------------------------------------ *
     * Filters
     * ------------------------------------------------------------------ */
    countByCategory(key) {
        if (key === 'all') return this.games.length;
        return this.games.filter(game => game.category === key).length;
    }

    getCategory(key) {
        return this.config.categories.find(category => category.key === key) || null;
    }

    getCategoryLabel(key) {
        const category = this.getCategory(key);
        return category ? category.label : key;
    }

    renderCategoryFilters() {
        if (!this.elements.categoryFilters) return;

        const categories = this.config.categories.filter(category => {
            if (!this.config.hideEmptyCategories) return true;
            return this.countByCategory(category.key) > 0;
        });

        if (!categories.some(category => category.key === this.currentCategory) && categories.length > 0) {
            this.currentCategory = categories[0].key;
        }

        this.elements.categoryFilters.innerHTML = categories.map(category => {
            const isActive = category.key === this.currentCategory ? ' active' : '';
            const count = this.countByCategory(category.key);
            const countHtml = `<span class="filter-count">${count}</span>`;
            return `<button class="filter-btn${isActive}" type="button" data-category="${category.key}">${category.label}${countHtml}</button>`;
        }).join('');

        this.elements.filterBtns = this.elements.categoryFilters.querySelectorAll('.filter-btn');
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.applyFilters();
            });
        });
    }

    setupEventListeners() {
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', () => {
                const isDark = document.documentElement.classList.toggle('dark');
                try {
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch (e) { }
            });
        }

        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value.toLowerCase().trim();
                this.applyFilters();
            });
        }

        // Clicking a version loads it into the frame
        if (this.elements.gamesGrid) {
            this.elements.gamesGrid.addEventListener('click', (event) => {
                const item = event.target.closest('.version-item');
                if (item) {
                    this.playVersion(item.dataset.path, item.dataset.key);
                }
            });
        }


        // Security Shield modal
        if (this.elements.securityBtn && this.elements.securityModal) {
            this.elements.securityBtn.addEventListener('click', () => {
                this.elements.securityModal.classList.add('active');
            });
        }
        if (this.elements.securityCloseBtn && this.elements.securityModal) {
            this.elements.securityCloseBtn.addEventListener('click', () => {
                this.elements.securityModal.classList.remove('active');
            });
            this.elements.securityModal.addEventListener('click', (e) => {
                if (e.target === this.elements.securityModal) {
                    this.elements.securityModal.classList.remove('active');
                }
            });
        }

        // Copy anti-ripping snippet
        if (this.elements.btnCopySecurity) {
            this.elements.btnCopySecurity.addEventListener('click', () => {
                const codeBlock = document.querySelector('.security-code-block code');
                if (codeBlock) {
                    const text = codeBlock.textContent;
                    const showCopied = () => {
                        const originalText = this.elements.btnCopySecurity.textContent;
                        this.elements.btnCopySecurity.textContent = 'Copied! ✓';
                        this.elements.btnCopySecurity.style.background = '#00ffc2';
                        this.elements.btnCopySecurity.style.color = '#020c17';
                        setTimeout(() => {
                            this.elements.btnCopySecurity.textContent = originalText;
                            this.elements.btnCopySecurity.style.background = '';
                            this.elements.btnCopySecurity.style.color = '';
                        }, 2000);
                    };
                    // navigator.clipboard is undefined on file:// and on insecure origins
                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(text).then(showCopied).catch(() => this.copyWithFallback(text, showCopied));
                    } else {
                        this.copyWithFallback(text, showCopied);
                    }
                }
            });
        }
    }

    /**
     * Copies text with a hidden textarea + execCommand, for when the async
     * Clipboard API is not available.
     */
    copyWithFallback(text, onCopied) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (e) {
            ok = false;
        }
        area.remove();
        if (ok) {
            onCopied();
        } else {
            alert('Copy failed. Select the code and copy it manually.');
        }
    }

    /* ------------------------------------------------------------------ *
     * Security Shield: Disable-Devtool Integration & Crash Protocol
     * ------------------------------------------------------------------ */
    setupSecurityShield() {
        if (typeof DisableDevtool !== 'undefined') {
            DisableDevtool({
                md5: '625d45c587033e8970af8b4e3fdb575c', // Bypass token: ?ddtk=dung
                tkName: 'ddtk',
                // Leave quietly: no page wipe or history loop (those freeze the tab and
                // misfire on viewport emulation / small screens)
                ondevtoolopen() {
                    try { window.location.replace('about:blank'); } catch (e) {}
                },
                disableMenu: true,
                clearLog: true,
                disableIframeParents: true
            });
        } else {
            window.addEventListener('keydown', (e) => {
                const key = e.key ? e.key.toUpperCase() : '';
                if (e.key === 'F12' || (e.ctrlKey && (key === 'U' || key === 'S'))) {
                    e.preventDefault();
                }
            }, true);
        }
    }

    /* ------------------------------------------------------------------ *
     * Game rendering & filtering
     * ------------------------------------------------------------------ */
    applyFilters() {
        let filtered = [...this.games];

        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(game => game.category === this.currentCategory);
        }

        if (this.currentSearch) {
            filtered = filtered.filter(game =>
                game.name.toLowerCase().includes(this.currentSearch) ||
                game.category.toLowerCase().includes(this.currentSearch) ||
                this.getCategoryLabel(game.category).toLowerCase().includes(this.currentSearch)
            );
        }

        this.filteredGames = filtered;
        this.renderGames();
    }

    renderResultCount() {
        if (!this.elements.resultCount) return;
        const shown = this.getTotals(this.filteredGames);
        const total = this.getTotals();
        this.elements.resultCount.textContent =
            `${shown.games}/${total.games} games · ${shown.versions} builds`;
    }

    renderGames() {
        this.renderResultCount();

        if (this.filteredGames.length === 0) {
            this.elements.gamesGrid.style.display = 'none';
            this.elements.noResults.style.display = 'block';
            return;
        }

        this.elements.noResults.style.display = 'none';
        this.elements.gamesGrid.style.display = 'block';
        this.elements.gamesGrid.innerHTML = this.filteredGames.map(game =>
            this.createGameCard(game)
        ).join('');

        this.markActiveVersion();
    }

    createGameCard(game) {
        const base = (this.config.paths && this.config.paths.directPrefix) || './playable/category';

        const versionsHtml = (game.versions || ['v1']).map(version => {
            const path = `${base}/${game.folder}/${version}.html`;
            const key = `${game.folder}/${version}`;
            return `<button class="version-item" type="button" data-path="${path}" data-key="${key}">${version}</button>`;
        }).join('');

        return `
            <article class="game-card" data-category="${game.category}">
                <div class="game-header">
                    <h3>${game.name}</h3>
                    <span class="game-category">${this.getCategoryLabel(game.category)}</span>
                </div>
                <div class="game-versions">
                    ${versionsHtml}
                </div>
            </article>
        `;
    }

    isMobile() {
        return window.matchMedia('(max-width: 900px)').matches ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    playVersion(path, key) {
        if (!path) return;

        if (window.deviceApi) {
            this.currentVersionKey = key;
            window.deviceApi.load(path);
            document.body.classList.add('has-game');

            if (this.elements.stageEmpty) {
                this.elements.stageEmpty.style.display = 'none';
            }

            // Phones hide the device frame, so play the build full screen instead
            if (this.isMobile() && window.deviceApi.enterFullscreen) {
                window.deviceApi.enterFullscreen();
            }

            this.markActiveVersion();
        }
    }

    markActiveVersion() {
        this.elements.gamesGrid.querySelectorAll('.version-item').forEach(item => {
            const active = item.dataset.key === this.currentVersionKey;
            item.classList.toggle('active', active);
            const card = item.closest('.game-card');
            if (card) card.classList.toggle('playing', active);
        });
    }
}

window.addEventListener('load', () => {
    window.gameList = new GameListManager(APP_CONFIG);
});
