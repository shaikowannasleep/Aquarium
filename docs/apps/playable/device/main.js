/**
 * Reads and writes settings in localStorage, falling back to defaults.
 */
class StorageManager {
    constructor(defaultSettings) {
        this.storage = {};
        this.defaultSettings = defaultSettings || {};
    }

    /**
     * Stores a value in memory and localStorage.
     * @param {string} key - Setting key.
     * @param {string} value - Setting value.
     */
    setParameter(key, value) {
        this.storage[key] = value;
        if (localStorage) {
            localStorage.setItem(key, value);
        }
    }

    /**
     * Reads a value from memory, localStorage or the defaults.
     * @param {string} key - Setting key.
     * @returns {string} The stored value.
     */
    getParameter(key) {
        if (this.storage[key] !== undefined) {
            return this.storage[key];
        }
        if (localStorage && localStorage[key]) {
            return localStorage[key];
        }
        if (this.defaultSettings[key] !== undefined) {
            return this.defaultSettings[key];
        }
        return "";
    }
}

/**
 * Owns the simulated device: the iframe, its size and the on-screen extras.
 */
class Device {
    constructor(screens, storage, parentElement) {
        this.screens = screens;
        this.storage = storage;
        this.body = document.querySelector("body");
        this.parent = parentElement;

        this.element = document.createElement("section");
        this.element.id = "device";

        this.screen = document.createElement("section");
        this.screen.id = "screen";
        this.element.append(this.screen);

        this.label = document.createElement("span");
        this.label.className = "label";
        this.screen.append(this.label);

        this.iframe = document.createElement("iframe");
        this.iframe.id = "iframe";
        this.iframe.setAttribute("allow", "autoplay");
        this.screen.append(this.iframe);

        // Everything drawn on top of the game lives in one layer that is scaled
        // with the zoom level, so the notch, home bar, toast and loader keep their
        // proportions instead of staying tiny when the frame grows.
        this.overlay = document.createElement("div");
        this.overlay.className = "screen-overlay";
        this.screen.append(this.overlay);

        // Screen cutout (notch / island / punch hole)
        this.cutout = document.createElement("span");
        this.cutout.className = "cutout";
        this.overlay.append(this.cutout);

        // iPhone-style home indicator bar
        this.homeBar = document.createElement("span");
        this.homeBar.className = "home-bar";
        this.overlay.append(this.homeBar);

        // CTA toast, slides down from the top edge of the screen
        this.toast = document.createElement("div");
        this.toast.className = "cta-toast";
        this.overlay.append(this.toast);
        
        // Loading overlay lives inside the phone screen, above the iframe
        this.loadingOverlay = document.getElementById("loading-overlay");
        if (this.loadingOverlay) {
            this.overlay.append(this.loadingOverlay);
        }

        // Hide the loader once the iframe is ready
        this.iframe.addEventListener("load", () => this.hideLoading());
        this.iframe.addEventListener("error", () => this.hideLoading());

        this.parent.append(this.element);
    }

    /**
     * Loads a build into the iframe.
     *
     * The html is fetched first so a tiny bootstrap script can be injected at the
     * very top of <head>. That script raises devicePixelRatio *before* the game
     * runs, which is the only reliable way to make the canvas allocate a
     * high-resolution backing store - patching it afterwards is a race the game
     * usually wins, and the preview ends up blurry when zoomed.
     * If the fetch fails for any reason we fall back to a plain src assignment.
     *
     * @param {string} path - Path to the game html file.
     */
    loadPage(path) {
        if (!path) {
            return;
        }

        this.pagePath = path;
        this.showLoading();

        const scale = Device.renderScale;
        const baseHref = path.replace(/[^/]+$/, "");
        const bootstrap = "<base href=\"" + baseHref + "\">" +
            "<script>Object.defineProperty(window,'devicePixelRatio',{configurable:true," +
            "get:function(){return " + scale + "}});window.__devicePixelRatioPatched=true;<\/script>";

        fetch(path)
            .then((response) => response.text())
            .then((html) => {
                if (this.pagePath !== path) {
                    return;
                }
                const withBootstrap = /<head[^>]*>/i.test(html)
                    ? html.replace(/<head[^>]*>/i, (match) => match + bootstrap)
                    : bootstrap + html;

                this.iframe.removeAttribute("src");
                this.iframe.srcdoc = withBootstrap;
                this.watchFrame();
            })
            .catch(() => {
                const hash = Math.floor(Math.random() * 10000);
                this.iframe.removeAttribute("srcdoc");
                this.iframe.setAttribute("src", `${path}?hash=${hash}`);
                this.watchFrame();
            });
    }

    /**
     * Reloads whatever build is currently shown.
     */
    reload() {
        if (this.pagePath) {
            this.loadPage(this.pagePath);
        }
    }

    /**
     * Applies the zoom level to the device container.
     */
    setScale() {
        // No transform: scaling a rasterised iframe is exactly what made deep zoom
        // blurry. The frame is rebuilt at its real pixel size instead, which is how
        // fullscreen stays crisp.
        const screenScale = Math.min(300, Math.max(40, parseInt(this.storage.getParameter("screenScale"), 10) || 80));

        this.parent.style.transform = "none";
        document.documentElement.style.setProperty("--device-zoom", screenScale / 100);
        this.resize();
        return screenScale;
    }

    /**
     * Resizes the iframe from the selected screen ratio and orientation.
     */
    resize() {
        const screenKey = this.storage.getParameter("screen");
        const screenConfig = this.screens[screenKey];
        const orientation = this.storage.getParameter("orientation");

        // Custom ratio: normalise to long side / short side and reuse the logic
        // below, so orientation still works and the frame never overflows
        if (screenConfig.isCustom) {
            const ratioW = Device.clampRatio(this.storage.getParameter("customRatioW"), 16);
            const ratioH = Device.clampRatio(this.storage.getParameter("customRatioH"), 9);
            const ratio = Math.max(ratioW, ratioH) / Math.min(ratioW, ratioH);

            // Cap extreme ratios (e.g. 50:1) so the frame cannot grow forever
            screenConfig.ratio = Math.min(3, ratio);
        }

        const baseWidth = screenConfig.ratio < 1.8 ? 320 : 375;
        this.body.classList.toggle("bigscreen", screenConfig.ratio >= 2);

        let height, width;
        if (orientation === "p") { // Portrait
            height = Math.floor(baseWidth * screenConfig.ratio);
            width = baseWidth;
        } else { // Landscape
            width = Math.round(baseWidth * screenConfig.ratio);
            height = baseWidth;
        }

        const zoom = Math.min(300, Math.max(40, parseInt(this.storage.getParameter("screenScale"), 10) || 80)) / 100;

        this.iframe.style.width = `${Math.round(width * zoom)}px`;
        this.iframe.style.height = `${Math.round(height * zoom)}px`;

        // Engines cache the frame size, so nudge them after the frame changed
        setTimeout(() => {
            const win = this.getFrameWindow();
            if (win) {
                liftEnginePixelRatioCap(win, Device.renderScale);
            }
        }, 60);
    }
    
    /**
     * Shows the toast inside the phone screen; spamming restarts the animation.
     * @param {string} message - Text to display.
     * @param {number} duration - Auto-hide delay in ms.
     */
    showToast(message, duration) {
        this.toast.textContent = message;

        clearTimeout(this.toastTimer);
        this.toast.classList.remove("_show");
        // Force a reflow so the animation restarts on repeated clicks
        void this.toast.offsetWidth;
        this.toast.classList.add("_show");

        this.toastTimer = setTimeout(() => {
            this.toast.classList.remove("_show");
        }, duration);
    }

    /**
     * @returns {Window|null} The iframe window, or null when unreachable.
     */
    getFrameWindow() {
        try {
            return this.iframe.contentWindow;
        } catch (e) {
            return null;
        }
    }

    /**
     * Notifies the app whenever the iframe gets a new document, so the bridges can
     * be installed before the game creates its AudioContext.
     */
    watchFrame() {
        if (typeof this.onFrameReady !== "function") {
            return;
        }
        if (this.frameWatcher) {
            clearInterval(this.frameWatcher);
        }

        this.onFrameReady();
        // Poll hard for 5s to get in before the game sets up audio/canvas
        this.frameWatcher = setInterval(() => this.onFrameReady(), 16);
        setTimeout(() => {
            clearInterval(this.frameWatcher);
            // Then poll slowly to catch late child frames or audio
            this.frameWatcher = setInterval(() => this.onFrameReady(), 1000);
        }, 5000);
    }

    /**
     * Clamps one side of the custom ratio to a sane range.
     * @param {string|number} value - Raw user input.
     * @param {number} fallback - Used when the input is invalid.
     * @returns {number} One side of the ratio.
     */
    static clampRatio(value, fallback) {
        const ratio = parseFloat(value);
        if (isNaN(ratio) || ratio <= 0) {
            return fallback;
        }
        return Math.min(32, Math.max(1, Math.round(ratio * 10) / 10));
    }

    /**
     * Shows the loading overlay
     */
    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add("show");
        }
    }
    
    /**
     * Hides the loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove("show");
        }
    }
}

/**
 * Builds and manages the screen ratio buttons.
 */
class Navigation {
    constructor(screens, storage) {
        this.storage = storage;
        this.element = document.createElement("nav");
        this.element.id = "navigation";
        this.items = [];

        for (const key in screens) {
            const item = this.createItem(key, screens[key]);
            this.items.push(item);
            this.element.append(item);
        }

        this.initEvents();
    }

    /**
     * Marks the active item.
     * @param {string} key - Screen ratio key.
     */
    setActiveItem(key) {
        this.items.forEach(item => {
            item.classList.toggle("_active", item.getAttribute("key") === key);
        });
        this.activeKey = key;
    }

    /**
     * Switches the current screen ratio.
     * @param {string} [screenKey] - Screen ratio key.
     */
    changeSize(screenKey) {
        const key = screenKey || this.storage.getParameter("screen");
        this.setActiveItem(key);
        this.storage.setParameter("screen", key);
        this.element.dispatchEvent(new Event("change"));
    }

    /**
     * Wires up the click handling.
     */
    initEvents() {
        let isLocked = false;
        this.element.addEventListener("click", (event) => {
            event.preventDefault();
            const navItem = event.target.closest(".navigation-ratio");
            if (navItem && !navItem.classList.contains("_active") && !isLocked) {
                isLocked = true;
                this.changeSize(navItem.getAttribute("key"));
                isLocked = false;
            }
        });
    }

    /**
     * Creates one navigation item.
     * @param {string} key - Screen key.
     * @param {object} screenData - Screen definition.
     * @returns {HTMLElement} The navigation item.
     */
    createItem(key, screenData) {
        const item = document.createElement("div");
        item.className = "navigation-item navigation-ratio";
        item.setAttribute("key", key);

        const title = document.createElement("span");
        title.className = "navigation-title";
        title.textContent = screenData.title;
        item.append(title);

        const code = document.createElement("span");
        code.className = "navigation-code";
        code.textContent = screenData.code;
        item.append(code);

        return item;
    }
}

/**
 * Portrait / landscape toggle.
 */
class OrientationControl {
    constructor(storage) {
        this.storage = storage;
        this.body = document.querySelector("body");

        this.element = document.createElement("div");
        this.element.id = "orientation";
        this.element.className = "navigation-item";

        const portraitIcon = document.createElement("div");
        portraitIcon.className = "portrait-icon";

        const landscapeIcon = document.createElement("div");
        landscapeIcon.className = "landscape-icon";

        this.element.append(portraitIcon, landscapeIcon);
        this.initEvents();
    }

    /**
     * Changes orientation and updates the body classes.
     * @param {string} [orientation] - 'p' portrait, 'l' landscape.
     */
    change(orientation) {
        const newOrientation = orientation || this.storage.getParameter("orientation");
        this.storage.setParameter("orientation", newOrientation);

        if (newOrientation === "p") {
            this.body.classList.remove("orientation-l");
            this.body.classList.add("orientation-p");
        } else {
            this.body.classList.remove("orientation-p");
            this.body.classList.add("orientation-l");
        }

        this.element.dispatchEvent(new Event("change"));
    }

    /**
     * Wires up the click handling.
     */
    initEvents() {
        this.element.addEventListener("click", (event) => {
            event.preventDefault();
            const currentOrientation = this.storage.getParameter("orientation");
            this.change(currentOrientation === "p" ? "l" : "p");
        });
    }
}

/**
 * Fullscreen mode: the iframe fills the visible page area (not the browser's own
 * F11 fullscreen), leaving only a floating exit button.
 */
class FullscreenControl {
    constructor(enterButton, exitButton, muteButton) {
        this.body = document.querySelector("body");
        this.enterButton = enterButton;
        this.exitButton = exitButton;
        this.muteButton = muteButton;
        this.muteHome = muteButton ? muteButton.parentElement : null;
        this.initEvents();
    }

    get isActive() {
        return this.body.classList.contains("fullscreen-mode");
    }

    enter() {
        this.body.classList.add("fullscreen-mode");
        // The panel is hidden, so move the sound button onto the floating bar
        const bar = document.getElementById("fs-controls");
        if (this.muteButton && bar) {
            bar.insertBefore(this.muteButton, this.exitButton);
        }
    }

    exit() {
        this.body.classList.remove("fullscreen-mode");
        if (this.muteButton && this.muteHome) {
            this.muteHome.insertBefore(this.muteButton, this.enterButton);
        }
    }

    toggle() {
        if (this.isActive) {
            this.exit();
        } else {
            this.enter();
        }
    }

    initEvents() {
        if (this.enterButton) {
            this.enterButton.addEventListener("click", () => this.enter());
        }
        if (this.exitButton) {
            this.exitButton.addEventListener("click", () => this.exit());
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isActive) {
                this.exit();
            }
        });
    }
}

/**
 * Screen cutout styles: none / notch / island / punch hole.
 */
class DeviceStyleControl {
    constructor(element, storage) {
        this.element = element;
        this.storage = storage;
        this.body = document.querySelector("body");
        this.styles = DeviceStyleControl.STYLES;

        this.render();
        this.apply(this.storage.getParameter("deviceStyle"));
        this.initEvents();
    }

    /**
     * Builds the buttons from the style table.
     */
    render() {
        if (!this.element) {
            return;
        }
        this.element.innerHTML = this.styles.map((style) => `
            <div class="navigation-item navigation-style" key="${style.key}" title="${style.title}">
                <span class="style-preview"></span>
            </div>
        `).join("");
    }

    /**
     * @param {string} style - Cutout style key.
     */
    apply(style) {
        const found = this.styles.find((item) => item.key === style) || this.styles[0];

        this.styles.forEach((item) => {
            this.body.classList.toggle(`device-style-${item.key}`, item === found);
        });
        // Cutout position along the edge: centre / start / end
        ["center", "start", "end"].forEach((align) => {
            this.body.classList.toggle(`cut-align-${align}`, align === found.align);
        });
        this.body.classList.toggle("has-cutout", Boolean(found.align));
        this.storage.setParameter("deviceStyle", found.key);

        if (this.element) {
            this.element.querySelectorAll(".navigation-style").forEach((item) => {
                item.classList.toggle("_active", item.getAttribute("key") === found.key);
            });
        }
    }

    initEvents() {
        if (!this.element) {
            return;
        }
        this.element.addEventListener("click", (event) => {
            const item = event.target.closest(".navigation-style");
            if (item) {
                event.preventDefault();
                this.apply(item.getAttribute("key"));
            }
        });
    }
}

/**
 * Screen cutout styles.
 * - key: maps to the `device-style-<key>` CSS class
 * - align: position along the edge (center/start/end); omitted = flat screen
 */
DeviceStyleControl.STYLES = [
    { key: "none", title: "Standard" },
    { key: "wide-notch", title: "Wide notch", align: "center" },
    { key: "notch", title: "Notch", align: "center" },
    { key: "teardrop", title: "Teardrop", align: "center" },
    { key: "island", title: "Dynamic Island", align: "center" },
    { key: "punch", title: "Punch hole", align: "center" },
    { key: "punch-left", title: "Punch hole left", align: "start" },
    { key: "punch-right", title: "Punch hole right", align: "end" },
    { key: "pill-left", title: "Pill left", align: "start" },
    { key: "pill-right", title: "Pill right", align: "end" },
];

/**
 * Rotates the phone 180deg: only the cutout swaps sides, the frame and the game
 * size stay exactly the same.
 */
class RotateControl {
    constructor(button, storage) {
        this.button = button;
        this.storage = storage;
        this.body = document.querySelector("body");

        this.apply(this.storage.getParameter("rotated") === "true");
        this.initEvents();
    }

    /**
     * @param {boolean} rotated - Whether the phone is flipped.
     */
    apply(rotated) {
        this.body.classList.toggle("rotated", rotated);
        this.storage.setParameter("rotated", rotated);

        if (this.button) {
            this.button.classList.toggle("_active", rotated);
        }
    }

    initEvents() {
        if (this.button) {
            this.button.addEventListener("click", () => {
                this.apply(!this.body.classList.contains("rotated"));
            });
        }
    }
}

/**
 * Audio bridge injected into the iframe so muting covers both <audio>/<video>
 * elements and Web Audio, which is what most games actually use.
 * @param {Window} win - The same-origin iframe window.
 */
function injectAudioBridge(win) {
    if (!win || win.__deviceAudioPatched) {
        return;
    }
    win.__deviceAudioPatched = true;

    const contexts = [];
    let muted = false;

    const remember = (context) => {
        if (!context || contexts.indexOf(context) !== -1) {
            return;
        }
        contexts.push(context);
        if (muted && context.suspend) {
            try {
                context.suspend();
            } catch (e) { }
        }
    };

    ["AudioContext", "webkitAudioContext"].forEach((name) => {
        const Original = win[name];
        if (!Original) {
            return;
        }

        // 1. Contexts created after the bridge is installed
        const Patched = function (...args) {
            const context = new Original(...args);
            remember(context);
            return context;
        };
        Patched.prototype = Original.prototype;
        win[name] = Patched;

        // 2. Games call resume() on touch, which would unmute again
        //    -> block it while muted
        const originalResume = Original.prototype.resume;
        if (originalResume && !Original.prototype.__deviceResumePatched) {
            Original.prototype.__deviceResumePatched = true;
            Original.prototype.resume = function () {
                remember(this);
                if (muted) {
                    return win.Promise ? win.Promise.resolve() : undefined;
                }
                return originalResume.apply(this, arguments);
            };
        }
    });

    // 3. Contexts created BEFORE the bridge was installed (games that start audio
    //    very early): every node must connect(), so hook that instead
    const AudioNode = win.AudioNode;
    if (AudioNode && !AudioNode.prototype.__deviceConnectPatched) {
        AudioNode.prototype.__deviceConnectPatched = true;
        const originalConnect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function () {
            remember(this.context);
            return originalConnect.apply(this, arguments);
        };
    }

    // 4. <audio>/<video>: block play() and any attempt to set muted = false
    const media = win.HTMLMediaElement;
    if (media && !media.prototype.__devicePlayPatched) {
        media.prototype.__devicePlayPatched = true;

        const originalPlay = media.prototype.play;
        media.prototype.play = function () {
            if (muted) {
                this.muted = true;
            }
            return originalPlay.apply(this, arguments);
        };

        const descriptor = Object.getOwnPropertyDescriptor(media.prototype, "muted");
        if (descriptor && descriptor.get && descriptor.set) {
            Object.defineProperty(media.prototype, "muted", {
                configurable: true,
                get: descriptor.get,
                set(value) {
                    descriptor.set.call(this, muted ? true : value);
                }
            });
        }
    }

    win.__deviceAudio = {
        set(value) {
            muted = value;

            contexts.forEach((context) => {
                try {
                    if (value) {
                        context.suspend();
                    } else if (context.state === "suspended") {
                        context.resume();
                    }
                } catch (e) { }
            });

            try {
                win.document.querySelectorAll("audio, video").forEach((element) => {
                    element.muted = value;
                });
            } catch (e) { }
        },

        /**
         * Snapshot of the audio state, handy when debugging.
         */
        report() {
            let media = [];
            try {
                media = Array.from(win.document.querySelectorAll("audio, video")).map((el) => el.muted);
            } catch (e) { }
            return {
                muted,
                contexts: contexts.map((context) => context.state),
                media
            };
        }
    };
}

/**
 * Some engines clamp the pixel ratio internally, so raising devicePixelRatio is
 * not enough. Cocos keeps the cap in `cc.view._maxPixelRatio` (2 by default);
 * lifting it and re-running the resize makes the canvas re-allocate at the
 * higher resolution, which is what keeps deep zoom sharp.
 * @param {Window} win - The same-origin iframe window.
 * @param {number} scale - Desired rendering scale.
 */
function liftEnginePixelRatioCap(win, scale) {
    try {
        const view = win.cc && win.cc.view;
        if (!view || typeof view.setDesignResolutionSize !== "function") {
            return;
        }

        const frame = view._frameSize;
        const sameRatio = view._devicePixelRatio >= scale;
        const sameFrame = frame &&
            Math.abs(frame.width - win.innerWidth) < 2 &&
            Math.abs(frame.height - win.innerHeight) < 2;
        if (sameRatio && sameFrame) {
            return;
        }

        // Raising the cap alone does nothing: the ratio is only computed while the
        // container is set up. Re-applying the design resolution re-runs that step,
        // so the canvas is re-allocated at the higher resolution and, just as
        // importantly, picks up the current frame size after an orientation change.
        view._maxPixelRatio = scale;
        view._devicePixelRatio = scale;

        if (typeof view.enableRetina === "function") {
            view.enableRetina(true);
        }
        if (typeof view.resizeWithBrowserSize === "function") {
            view.resizeWithBrowserSize(true);
        }
        if (typeof view._initFrameSize === "function") {
            view._initFrameSize();
        }

        const design = view.getDesignResolutionSize();
        const policy = typeof view.getResolutionPolicy === "function"
            ? view.getResolutionPolicy()
            : undefined;
        view.setDesignResolutionSize(design.width, design.height, policy);
    } catch (e) { }
}

/**
 * Shared state for the bridges injected into the iframe.
 * ClickControl writes here, the bridge reads it when a click happens.
 */
const FRAME_HOOKS = {
    ctaEnabled: () => false,
    onCtaClick: () => { }
};

/**
 * Blocks every way a playable can open its store link: window.open, <a> tags
 * and the ad SDK's mraid.open.
 * @param {Window} win - The same-origin iframe window.
 */
function injectClickBridge(win) {
    if (!win || win.__deviceClickPatched) {
        return;
    }
    win.__deviceClickPatched = true;

    const intercept = () => {
        if (!FRAME_HOOKS.ctaEnabled()) {
            return false;
        }
        FRAME_HOOKS.onCtaClick();
        return true;
    };

    // window.open: by far the most common path
    const originalOpen = win.open;
    win.open = function (...args) {
        if (intercept()) {
            // Return a stub window so .focus()/.close() calls do not throw
            return { closed: false, focus() { }, close() { }, postMessage() { } };
        }
        return originalOpen.apply(win, args);
    };

    // <a href> links, including target=_blank
    win.document.addEventListener("click", (event) => {
        const link = event.target && event.target.closest && event.target.closest("a[href]");
        if (!link) {
            return;
        }
        const href = link.getAttribute("href") || "";
        if (href.startsWith("#") || href.startsWith("javascript:")) {
            return;
        }
        if (intercept()) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    // mraid.open from the ad SDK
    if (win.mraid && typeof win.mraid.open === "function") {
        const originalMraidOpen = win.mraid.open;
        win.mraid.open = function (...args) {
            if (intercept()) {
                return;
            }
            return originalMraidOpen.apply(win.mraid, args);
        };
    }
}

/**
 * Raises the game's rendering resolution by reporting a higher devicePixelRatio,
 * so engines (Phaser/Pixi/Cocos/Unity...) allocate a bigger canvas backing
 * store and zooming stays sharp instead of being upscaled.
 * Must run before the game creates its canvas, hence the watchFrame polling.
 * @param {Window} win - The same-origin iframe window.
 * @param {number} ratio - Desired rendering scale.
 */
function injectPixelRatio(win, ratio) {
    if (!win || win.__devicePixelRatioPatched) {
        return;
    }
    try {
        Object.defineProperty(win, "devicePixelRatio", {
            configurable: true,
            get: () => ratio
        });
        win.__devicePixelRatioPatched = true;
    } catch (e) { }
}

/**
 * Mute toggle for the game running in the iframe.
 */
class AudioControl {
    constructor(button, device, storage) {
        this.button = button;
        this.device = device;
        this.storage = storage;
        this.muted = this.storage.getParameter("muted") === "true";

        this.device.onFrameReady = () => this.apply();
        this.device.watchFrame();
        this.updateButton();
        this.initEvents();
    }

    /**
     * Pushes the mute state into the iframe.
     */
    apply() {
        this.applyTo(this.device.getFrameWindow(), 0);
    }

    /**
     * Installs the bridges in a window, then recurses into child frames
     * (some playables nest the game in another iframe).
     * @param {Window} win - Window to patch.
     * @param {number} depth - Current depth, capped at 3 levels.
     */
    applyTo(win, depth) {
        if (!win || depth > 3) {
            return;
        }
        try {
            injectAudioBridge(win);
            injectClickBridge(win);
            injectPixelRatio(win, AudioControl.RENDER_SCALE);
            liftEnginePixelRatioCap(win, AudioControl.RENDER_SCALE);

            if (win.__deviceAudio && win.__deviceAudioState !== this.muted) {
                win.__deviceAudio.set(this.muted);
                win.__deviceAudioState = this.muted;
            }

            for (let i = 0; i < win.frames.length; i++) {
                this.applyTo(win.frames[i], depth + 1);
            }
        } catch (e) { }
    }

    toggle() {
        this.muted = !this.muted;
        this.storage.setParameter("muted", this.muted);
        this.updateButton();
        this.apply();
    }

    updateButton() {
        if (!this.button) {
            return;
        }
        this.button.classList.toggle("_muted", this.muted);
        this.button.title = this.muted ? "Sound is off — click to unmute" : "Sound is on — click to mute";

        const label = this.button.querySelector(".btn-label");
        if (label) {
            label.textContent = this.muted ? "Sound off" : "Sound on";
        }
    }

    initEvents() {
        if (this.button) {
            this.button.addEventListener("click", () => this.toggle());
        }
    }
}

// Run once the page has finished loading
/**
 * Home indicator bar at the bottom of the screen.
 */
class HomeBarControl {
    constructor(button, positionGroup, storage, config) {
        this.button = button;
        this.positionGroup = positionGroup;
        this.storage = storage;
        this.config = config || {};
        this.body = document.querySelector("body");

        const stored = this.storage.getParameter("homeBar");
        this.apply(stored === "" ? this.config.homeBar !== false : stored === "true");
        this.applyPosition(this.storage.getParameter("homeBarPosition") || this.config.homeBarPosition);
        this.initEvents();
    }

    /**
     * @param {string} position - "device" (opposite the cutout) or "screen" (always at the bottom).
     */
    applyPosition(position) {
        const value = position === "screen" ? "screen" : "device";

        this.body.classList.toggle("home-bar-screen", value === "screen");
        this.storage.setParameter("homeBarPosition", value);

        if (this.positionGroup) {
            this.positionGroup.querySelectorAll(".seg-btn").forEach((item) => {
                item.classList.toggle("_active", item.dataset.position === value);
            });
        }
    }

    /**
     * @param {boolean} visible - Whether the bar is drawn.
     */
    apply(visible) {
        this.body.classList.toggle("has-home-bar", visible);
        this.storage.setParameter("homeBar", visible);

        if (this.button) {
            this.button.classList.toggle("_active", visible);
            this.button.title = visible
                ? "Home bar is shown - click to hide it"
                : "Home bar is hidden - click to show it";
        }
    }

    initEvents() {
        if (this.button) {
            this.button.addEventListener("click", () => {
                this.apply(!this.body.classList.contains("has-home-bar"));
            });
        }
        if (this.positionGroup) {
            this.positionGroup.addEventListener("click", (event) => {
                const item = event.target.closest(".seg-btn");
                if (item) {
                    this.applyPosition(item.dataset.position);
                }
            });
        }
    }
}

/**
 * Corner radius of the phone frame. The screen radius follows via CSS.
 */
class RadiusControl {
    constructor(slider, label, storage, fallback) {
        this.slider = slider;
        this.label = label;
        this.storage = storage;
        this.fallback = fallback || 26;

        this.apply(this.storage.getParameter("cornerRadius"));
        this.initEvents();
    }

    /**
     * @param {string|number} value - Radius in pixels.
     */
    apply(value) {
        const radius = Math.min(80, Math.max(0, parseInt(value, 10) || 0));

        document.documentElement.style.setProperty("--device-radius", `${radius}px`);
        this.storage.setParameter("cornerRadius", radius);

        if (this.slider) {
            this.slider.value = radius;
        }
        if (this.label) {
            this.label.textContent = `${radius}px`;
        }
    }

    initEvents() {
        if (this.slider) {
            this.slider.addEventListener("input", () => this.apply(this.slider.value));
        }
    }
}

/**
 * Device model presets manager (e.g., iPhone 14 Pro Max vs iPad Pro).
 */
class DevicePresetControl {
    constructor(buttons, navigation, deviceStyleControl, radiusControl, storage) {
        this.buttons = buttons;
        this.navigation = navigation;
        this.deviceStyleControl = deviceStyleControl;
        this.radiusControl = radiusControl;
        this.storage = storage;

        this.presets = {
            ip14promax: {
                screen: "X",      // 19.5:9
                style: "island",  // Dynamic Island
                radius: 52
            },
            ipad: {
                screen: "4_3",    // 4:3
                style: "none",    // Standard Tablet Bezel
                radius: 22
            }
        };

        this.init();
    }

    init() {
        if (!this.buttons || this.buttons.length === 0) return;

        this.buttons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const deviceKey = btn.dataset.device;
                this.applyPreset(deviceKey);
            });
        });

        // Set initial button active state
        const currentScreen = this.storage.getParameter("screen");
        if (currentScreen === "4_3") {
            this.setActive("ipad");
        } else {
            this.setActive("ip14promax");
        }
    }

    setActive(deviceKey) {
        this.buttons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.device === deviceKey);
        });
    }

    applyPreset(deviceKey) {
        const config = this.presets[deviceKey];
        if (!config) return;

        this.setActive(deviceKey);

        // 1. Change Screen Ratio
        if (this.navigation) {
            this.navigation.changeSize(config.screen);
        }

        // 2. Change Cutout Style
        if (this.deviceStyleControl) {
            this.deviceStyleControl.apply(config.style);
        }

        // 3. Change Corner Radius
        if (this.radiusControl) {
            this.radiusControl.apply(config.radius);
        }
    }
}

/**
 * Light/dark toggle sharing the 'theme' key with the rest of the app.
 */
class ThemeControl {
    constructor(button) {
        this.button = button;
        if (this.button) {
            this.button.addEventListener("click", () => {
                const dark = document.documentElement.classList.toggle("dark");
                try {
                    localStorage.setItem("theme", dark ? "dark" : "light");
                } catch (e) { }
            });
        }
    }
}

// Rendering scale forced on the game. The frame is already built at its real
// pixel size, so the only extra resolution worth asking for is the screen's own
// pixel ratio - anything above that just burns GPU for no visible gain.
Device.renderScale = Math.min(3, Math.max(1,
    ((typeof DEVICE_CONFIG !== "undefined" && DEVICE_CONFIG.renderScale) || 1) * (window.devicePixelRatio || 1)));
AudioControl.RENDER_SCALE = Device.renderScale;

/**
 * CTA blocking: when enabled an ad click only shows a toast, when disabled the
 * link opens normally like on a real device.
 */
class ClickControl {
    constructor(button, device, storage, config) {
        this.button = button;
        this.device = device;
        this.storage = storage;
        this.config = config || {};

        const stored = this.storage.getParameter("ctaToast");
        this.enabled = stored === "" ? this.config.enabled !== false : stored === "true";

        FRAME_HOOKS.ctaEnabled = () => this.enabled;
        FRAME_HOOKS.onCtaClick = () => this.device.showToast(
            this.config.message || "You have successfully clicked",
            this.config.duration || 1500
        );

        // Games may call top.open()/parent.open(), block those too
        const originalOpen = window.open;
        window.open = (...args) => {
            if (this.enabled) {
                FRAME_HOOKS.onCtaClick();
                return { closed: false, focus() { }, close() { }, postMessage() { } };
            }
            return originalOpen.apply(window, args);
        };

        this.update();
        this.initEvents();
    }

    toggle() {
        this.enabled = !this.enabled;
        this.storage.setParameter("ctaToast", this.enabled);
        this.update();
    }

    update() {
        if (this.button) {
            this.button.classList.toggle("_active", this.enabled);
            this.button.title = this.enabled
                ? "Ad clicks show a toast — click to open real links instead"
                : "Ad clicks open the real store link — click to block them";

            const label = this.button.querySelector(".btn-label");
            if (label) {
                label.textContent = this.enabled ? "CTA: toast" : "CTA: real link";
            }
        }
    }

    initEvents() {
        if (this.button) {
            this.button.addEventListener("click", () => this.toggle());
        }
    }
}

window.addEventListener("load", () => {
    // Screen ratio definitions
    const screenDefinitions = {
        "4_3": { title: "4:3", code: "emn", ratio: 4 / 3 },
        "3_2": { title: "3:2", code: "mn", ratio: 1.5 },
        "16_10": { title: "16:10", code: "xsm", ratio: 1.6 },
        "5_3": { title: "5:3", code: "sm", ratio: 5 / 3 },
        "16_9": { title: "16:9", code: "md", ratio: 16 / 9 },
        "16_8": { title: "16:8", code: "lg", ratio: 2 },
        "X": { title: "19.5:9", code: "xlg", ratio: 19.5 / 9 },
        "custom": { title: "Custom", code: "cst", ratio: 1, isCustom: true },
    };

    // Container elements
    const domElements = {
        navigation: document.getElementById("navigation-container"),
        orientation: document.getElementById("orientation-container"),
        device: document.getElementById("device-container"),
        scaleInput: document.getElementById("scale"),
        zoomValue: document.getElementById("zoomValue"),
        customRatioW: document.getElementById("customRatioW"),
        customRatioH: document.getElementById("customRatioH"),
        deviceStyle: document.getElementById("device-style"),
        rotateBtn: document.getElementById("rotateBtn"),
        fullscreenBtn: document.getElementById("fullscreenBtn"),
        exitFullscreenBtn: document.getElementById("exitFullscreen"),
        muteBtn: document.getElementById("muteBtn"),
        ctaBtn: document.getElementById("ctaBtn"),
        themeBtn: document.getElementById("themeBtn"),
        cornerRadius: document.getElementById("cornerRadius"),
        homeBarBtn: document.getElementById("homeBarBtn"),
        homeBarPosition: document.getElementById("home-bar-position"),
        radiusValue: document.getElementById("radiusValue"),
    };

    // Bootstrap the modules
    const storage = new StorageManager({
        screen: "16_9",
        orientation: "l",
        screenScale: 80,
        customRatioW: 16,
        customRatioH: 9,
        deviceStyle: "none",
        rotated: false,
        cornerRadius: (typeof DEVICE_CONFIG !== "undefined" && DEVICE_CONFIG.cornerRadius) || 26,
    });
    
    const navigation = new Navigation(screenDefinitions, storage);
    const orientationControl = new OrientationControl(storage);
    const device = new Device(screenDefinitions, storage, domElements.device);

    // Attach the widgets to the DOM
    domElements.navigation.append(navigation.element);
    domElements.orientation.append(orientationControl.element);
    // The rotate button sits after the orientation button
    domElements.orientation.append(domElements.rotateBtn);

    // Initial state
    navigation.changeSize();
    orientationControl.change();
    device.resize();
    device.setScale();
    domElements.scaleInput.value = storage.getParameter("screenScale");

    // Fullscreen + mute + screen cutout controls
    new FullscreenControl(domElements.fullscreenBtn, domElements.exitFullscreenBtn, domElements.muteBtn);
    new AudioControl(domElements.muteBtn, device, storage);
    const deviceStyleControl = new DeviceStyleControl(domElements.deviceStyle, storage);
    new ThemeControl(domElements.themeBtn);
    new ClickControl(domElements.ctaBtn, device, storage, (typeof DEVICE_CONFIG !== "undefined" ? DEVICE_CONFIG.ctaToast : null));
    new RotateControl(domElements.rotateBtn, storage);
    const radiusControl = new RadiusControl(domElements.cornerRadius, domElements.radiusValue, storage,
        (typeof DEVICE_CONFIG !== "undefined" ? DEVICE_CONFIG.cornerRadius : 26));
    new HomeBarControl(domElements.homeBarBtn, domElements.homeBarPosition, storage,
        (typeof DEVICE_CONFIG !== "undefined" ? DEVICE_CONFIG : {}));

    const presetButtons = document.querySelectorAll(".preset-device-btn");
    window.devicePresetControl = new DevicePresetControl(presetButtons, navigation, deviceStyleControl, radiusControl, storage);

    // Custom ratio: restore saved values, inputs only show on the Custom tab
    const syncCustomPanel = () => {
        document.body.classList.toggle("custom-active", storage.getParameter("screen") === "custom");
    };
    domElements.customRatioW.value = Device.clampRatio(storage.getParameter("customRatioW"), 16);
    domElements.customRatioH.value = Device.clampRatio(storage.getParameter("customRatioH"), 9);
    syncCustomPanel();

    const applyCustomRatio = () => {
        const ratioW = Device.clampRatio(domElements.customRatioW.value, 16);
        const ratioH = Device.clampRatio(domElements.customRatioH.value, 9);

        domElements.customRatioW.value = ratioW;
        domElements.customRatioH.value = ratioH;
        storage.setParameter("customRatioW", ratioW);
        storage.setParameter("customRatioH", ratioH);
        device.resize();
    };

    [domElements.customRatioW, domElements.customRatioH].forEach(input => {
        input.addEventListener("change", applyCustomRatio);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                input.blur();
            }
        });
    });

    // Event wiring
    navigation.element.addEventListener("change", () => {
        syncCustomPanel();
        device.resize();
    });

    orientationControl.element.addEventListener("change", () => {
        device.resize();
    });

    const applyScale = () => {
        const scaleValue = Math.min(300, Math.max(40, parseInt(domElements.scaleInput.value, 10) || 80));
        domElements.scaleInput.value = scaleValue;
        storage.setParameter("screenScale", scaleValue);
        device.setScale();
        if (domElements.zoomValue) {
            domElements.zoomValue.textContent = `${scaleValue}%`;
        }
    };
    // 'input' so the zoom follows the slider live instead of on release
    domElements.scaleInput.addEventListener("input", applyScale);
    applyScale();
    
    // Show the loader when restarting
    const restartBtn = document.querySelector(".navigation-restart");
    if (restartBtn) {
        restartBtn.addEventListener("click", (e) => {
            e.preventDefault();
            device.reload();
        });
    }

    // The app uses this API to load a build when a version is clicked
    window.deviceApi = {
        device,
        load: (path) => device.loadPage(path)
    };

});