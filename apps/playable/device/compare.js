/**
 * Compare mode: runs the current build on several real device presets side by side.
 * Every frame gets the same html (fetched once), muted and with the CTA blocked so
 * four copies of the ad do not play four soundtracks or open four store tabs.
 */
class CompareView {
    /**
     * @param {HTMLElement} button - Toggle button.
     * @param {HTMLElement} root - #compare-grid container inside the stage.
     * @param {Object} screens - Screen ratio definitions (key -> { ratio }).
     * @param {StorageManager} storage - Shared settings (orientation lives here).
     * @param {Array} presets - DEVICE_PRESETS.
     * @param {Device} device - Main simulator, paused while comparing.
     */
    constructor(button, root, screens, storage, presets, device) {
        this.button = button;
        this.root = root;
        this.screens = screens;
        this.storage = storage;
        this.presets = presets;
        this.device = device;
        this.active = false;
        this.path = null;
        this.html = null;
        this.cells = [];

        const saved = (localStorage.getItem("compareDevices") || "").split(",").filter(Boolean);
        this.selected = saved.length ? saved : CompareView.DEFAULT_DEVICES.slice();

        if (!this.button || !this.root) return;

        this.root.innerHTML = `
            <div class="compare-toolbar">
                <span class="compare-title">Compare devices</span>
                <div class="compare-chips"></div>
            </div>
            <div class="compare-cells"></div>
            <div class="compare-empty">Pick a build on the left to compare it on every device</div>`;
        this.chips = this.root.querySelector(".compare-chips");
        this.cellsEl = this.root.querySelector(".compare-cells");
        this.renderChips();

        this.button.addEventListener("click", () => this.toggle(!this.active));
        window.addEventListener("resize", () => this.layout());
    }

    renderChips() {
        this.chips.innerHTML = this.presets.map((p) => `
            <button type="button" class="compare-chip${this.selected.includes(p.key) ? " active" : ""}" data-device="${p.key}" title="${p.specs}">${p.name}</button>`).join("");
        this.chips.querySelectorAll(".compare-chip").forEach((chip) => {
            chip.addEventListener("click", () => {
                const key = chip.dataset.device;
                const on = this.selected.includes(key);
                // Keep at least one device and at most six (each one runs the full game)
                if (on && this.selected.length === 1) return;
                if (!on && this.selected.length >= CompareView.MAX_DEVICES) return;
                this.selected = on ? this.selected.filter((k) => k !== key)
                    : this.presets.map((p) => p.key).filter((k) => k === key || this.selected.includes(k));
                localStorage.setItem("compareDevices", this.selected.join(","));
                chip.classList.toggle("active", !on);
                this.renderCells();
            });
        });
    }

    toggle(on) {
        this.active = on;
        document.body.classList.toggle("compare-mode", on);
        this.button.classList.toggle("_active", on);
        const label = this.button.querySelector(".btn-label");
        if (label) label.textContent = on ? "Single device" : "Compare devices";

        if (on) {
            // Pause the main frame: five copies of a WebGL ad is too much
            if (this.device) {
                this.device.iframe.removeAttribute("srcdoc");
                this.device.iframe.src = "about:blank";
            }
            this.load(this.device && this.device.pagePath);
        } else {
            this.cellsEl.innerHTML = "";
            this.cells = [];
            if (this.device) this.device.reload();
        }
    }

    /** Called by deviceApi.load whenever a version is picked. */
    setPath(path) {
        this.path = path;
        if (this.active) {
            if (this.device) {
                this.device.iframe.removeAttribute("srcdoc");
                this.device.iframe.src = "about:blank";
            }
            this.load(path);
        }
    }

    load(path) {
        this.path = path || this.path;
        this.root.classList.toggle("has-build", Boolean(this.path));
        if (!this.path) {
            this.renderCells();
            return;
        }
        const target = this.path;
        fetch(target)
            .then((response) => response.text())
            .then((html) => {
                if (target !== this.path) return;
                this.html = CompareView.prepare(html, target);
                this.renderCells();
            })
            .catch(() => {
                this.html = null;
                this.renderCells();
            });
    }

    renderCells() {
        if (!this.cellsEl) return;
        this.cellsEl.innerHTML = "";
        this.cells = this.selected.map((key) => this.presets.find((p) => p.key === key)).filter(Boolean).map((preset) => {
            const style = DeviceStyleControl.STYLES.find((s) => s.key === preset.style) || DeviceStyleControl.STYLES[0];
            const cell = document.createElement("figure");
            cell.className = "compare-cell";
            cell.dataset.device = preset.key;
            cell.innerHTML = `
                <figcaption><strong>${preset.name}</strong><span>${preset.specs}</span></figcaption>
                <div class="compare-frame device-style-${preset.style}${style.align ? ` cmp-cut cmp-align-${style.align}` : ""}">
                    <div class="compare-screen">
                        <iframe allow="autoplay" title="${preset.name}"></iframe>
                        <span class="compare-cutout"></span>
                    </div>
                </div>`;
            this.cellsEl.append(cell);
            const iframe = cell.querySelector("iframe");
            if (this.html) {
                iframe.srcdoc = this.html;
            } else if (this.path) {
                iframe.src = this.path;
            }
            return { cell, preset, frame: cell.querySelector(".compare-frame"), iframe };
        });
        this.layout();
    }

    /** Fits every frame into the stage, picking the column count with the biggest scale. */
    layout() {
        if (!this.active || !this.cells.length) return;
        const landscape = this.storage.getParameter("orientation") === "l";
        const sizes = this.cells.map(({ preset }) => {
            const ratio = (this.screens[preset.screen] || { ratio: 16 / 9 }).ratio;
            const base = ratio < 1.8 ? 320 : 375;
            const long = Math.round(base * ratio);
            return landscape ? { w: long, h: base } : { w: base, h: long };
        });

        const box = this.cellsEl.getBoundingClientRect();
        const W = Math.max(200, box.width - 8);
        const H = Math.max(200, box.height - 8);
        const gap = 18, caption = 34, bezel = 16;
        const maxW = Math.max(...sizes.map((s) => s.w));
        const maxH = Math.max(...sizes.map((s) => s.h));
        const n = sizes.length;

        let best = { scale: 0, cols: n };
        for (let cols = 1; cols <= n; cols++) {
            const rows = Math.ceil(n / cols);
            const scale = Math.min(
                (W - gap * (cols - 1)) / cols / (maxW + bezel),
                (H - gap * (rows - 1)) / rows / (maxH + bezel + caption)
            );
            if (scale > best.scale) best = { scale, cols };
        }
        const scale = Math.min(1.2, best.scale);
        this.cellsEl.style.gridTemplateColumns = `repeat(${best.cols}, auto)`;
        this.root.style.setProperty("--cmp-scale", scale.toFixed(3));
        this.root.classList.toggle("cmp-landscape", landscape);

        this.cells.forEach(({ frame, iframe, preset }, i) => {
            iframe.style.width = `${Math.round(sizes[i].w * scale)}px`;
            iframe.style.height = `${Math.round(sizes[i].h * scale)}px`;
            frame.style.setProperty("--device-radius", `${preset.radius}px`);
        });
    }

    /**
     * Injects <base> (so relative assets resolve), mutes audio and blocks the CTA.
     * @param {string} html - Build html.
     * @param {string} path - Build url, used for the base href.
     */
    static prepare(html, path) {
        const baseHref = path.replace(/[^/]+$/, "");
        const boot = "<base href=\"" + baseHref + "\"><script>(function(){" +
            "window.open=function(){return null};" +
            "var A=window.AudioContext||window.webkitAudioContext;" +
            "if(A){var M=function(o){var c=new A(o);try{c.suspend()}catch(e){}c.resume=function(){return Promise.resolve()};return c};" +
            "M.prototype=A.prototype;window.AudioContext=M;window.webkitAudioContext=M;}" +
            "try{Object.defineProperty(HTMLMediaElement.prototype,'muted',{configurable:true,get:function(){return true},set:function(){}});}catch(e){}" +
            "})();<\/script>";
        return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + boot) : boot + html;
    }
}

CompareView.DEFAULT_DEVICES = ["iphone-se", "ip14promax", "pixel-8", "galaxy-s24"];
CompareView.MAX_DEVICES = 6;
