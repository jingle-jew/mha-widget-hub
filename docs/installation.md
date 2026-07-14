# Installation

## Prerequisites

Before installing MHA Widget Hub, ensure you have:

- A working Home Assistant installation
- HACS installed
- Administrator access to Home Assistant

---

## Install through HACS

1. Open HACS.
2. Navigate to Integrations.
3. Add the MHA Widget Hub repository as a custom repository.
4. Install MHA Widget Hub.
5. Restart Home Assistant if required.

Published HACS versions use the `mha-widget-hub-hacs.zip` release asset, whose
root is the complete integration including its generated frontend. The separate
`mha-widget-hub.zip` archive is intended for manual extraction at the Home
Assistant configuration root and therefore contains `custom_components/`.
Installing a source archive from the default branch is not supported because
generated frontend files are intentionally not versioned.

---

## Add the Panel

After installation:

1. Open Home Assistant.
2. Go to Integrations & Devices
3. Search for MHA Widget Hub
4. Complete the initial setup if prompted.

---

## First Launch

On first launch you can:

- Create pages
- Add widgets
- Select a visual theme
- Configure the dock
- Customize wallpapers

Settings are stored locally and can be customized independently on different devices.

---

## Troubleshooting

### Blank screen

- Refresh the browser.
- Clear browser cache.
- Verify that the frontend files were updated correctly.

### Missing widgets

- Confirm that the widget is enabled.
- Verify that the associated Home Assistant entity exists.

### Theme issues

- Reload the page after changing themes.
- Verify that all theme assets were installed correctly.
