import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-weather-why',
    version: '0.1.0',
    icon: '🌤️',
    title: 'weather-why',
    description:
        "Click anywhere on the map and find out why the weather there is doing what it's doing — visual annotations + curated science, designed for curious adults. No jargon walls.",
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
