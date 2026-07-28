# User Guide

## What is MHA Widget Hub?

MHA Widget Hub is a launcher-style interface for Home Assistant.

Instead of organizing your home using dashboard cards, MHA lets you build pages composed of widgets that can be positioned and resized freely.

---

## Creating a Page

1. Enter edit mode.
2. Open the page manager.
3. Create a new page.
4. Choose a page name.
5. Save.

---

## Adding a Widget

1. Enter edit mode.
2. Open the widget manager.
3. Select a widget.
4. Configure the widget if required.
5. Place it on the grid.

Some widgets offer multiple variants and sizes.

---

## Configuring a Widget

Most widgets can be configured after creation.

Typical options include:

- Display name
- Entity selection
- Variant selection
- Appearance settings

Open widget settings to modify an existing widget.

---

## Using the Dock

The dock provides quick access to:

- Pages
- Settings
- Edit mode
- Administrative functions

Depending on device size, the dock may appear:

- Left
- Right
- Bottom

---

## Themes

MHA currently includes:

- OneUI
- iOS with an adjustable glass tint
- Material

Themes can be changed at any time from the settings panel.

With the iOS style selected, **Glass tint** continuously mixes the outer surface
of standard widgets between the Liquid endpoint at 0% and the Frosted endpoint
at 100%. The rest of the iOS interface remains visually identical.

**Widget tint** independently controls the special Calendar and main Weather
surfaces:

- **Transparent** makes them inherit the same adjustable generic glass surface;
- **Tinted** gives Calendar its dedicated light/dark reference surface and gives
  the main Weather widget a gradient adapted to the current condition.

Weather metrics, Weather summary and Weather radar are not special surfaces and
continue to follow their existing contracts.

---

## Wallpapers

You can customize wallpapers for:

- Light mode
- Dark mode

Supported formats:

- JPG
- JPEG
- PNG
- WEBP

---

## Mobile Experience

MHA automatically adapts to:

- Phones
- Tablets
- Desktop computers

Widget layouts and controls adjust to available space.

---

## Home Assistant Entities

Widgets connect directly to Home Assistant entities.

Examples:

- Lights
- Switches
- Climate devices
- Weather entities
- Media players
- Sensors

Only entities allowed by the administrator will appear in selection lists.
