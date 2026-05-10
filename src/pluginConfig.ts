import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-weather-why',
    version: '0.1.0',
    icon: '🌤️',
    title: 'Weather Why',
    description:
        "Click any spot on any Windy layer (wind, rain, pressure, jet stream, satellite, CAPE, dust, waves, more) and find out why the weather there is doing what it's doing. Each click yields a short hand-written card that names the pattern, explains the mechanism, and toggles to a related layer so you can verify what you're seeing.",
    author: 'ajin',
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    routerPath: '/weather-why/:lat?/:lon?',
    private: true,
    // Plugin receives map clicks while open — this is the core interaction.
    listenToSingleclick: true,
    // Right-click on the map adds a "weather-why" item that opens the plugin
    // with the clicked lat/lon already loaded.
    addToContextmenu: true,
};

export default config;
