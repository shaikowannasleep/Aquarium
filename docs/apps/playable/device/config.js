/**
 * Device simulator configuration.
 */
const DEVICE_CONFIG = {
    /**
     * Intercept the playable CTA (window.open / links) and show a toast
     * instead of opening a new tab.
     * - enabled : default state of the toggle button (user choice wins afterwards)
     * - duration: how long the toast stays, in milliseconds
     * - message : toast text
     */
    ctaToast: {
        enabled: true,
        duration: 1500,
        message: "You have successfully clicked"
    },

    /**
     * Extra sharpness multiplier on top of the screen's own pixel ratio.
     * 1 already renders 1:1 with the physical pixels because the device frame is
     * built at its real size; raise it only if you want supersampling.
     */
    renderScale: 1,

    /**
     * Default corner radius of the phone frame, in pixels.
     * The screen radius follows automatically (frame radius minus the bezel).
     */
    cornerRadius: 26,

    /** Show the iPhone-style home indicator bar by default. */
    homeBar: true,

    /**
     * Where the home bar sits in landscape:
     * - "device": on the phone's bottom edge, opposite the cutout (like a real phone)
     * - "screen": always horizontal along the bottom of the screen
     */
    homeBarPosition: "device"
};
