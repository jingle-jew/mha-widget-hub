# MHA Widget Hub

<img src="assets/brand/mha-widget-hub-logo.svg" width="800">

> The family-first Home Assistant launcher.

MHA Widget Hub is a custom Home Assistant launcher built around a spatial, widget-based interface designed for shared family spaces.

Instead of presenting a traditional dashboard made of cards, MHA provides a launcher surface where widgets have deliberate sizes, positions, and visual hierarchy. A power user can configure the experience, while everyone else gets a clean, touch-friendly interface.

MHA is intentionally built around its own native widget system. It does not depend on Home Assistant dashboard cards or external HACS card dependencies for its core interface.

---

## Features

### Widget-Based Home Screen

- Multi-page launcher
- Drag-and-drop widget placement
- Widget variants and sizing
- Widget configuration flows
- Responsive layouts
- Dedicated page experiences such as media pages
- Screensaver and NowBar surfaces

### Visual Systems

- OneUI
- iOS Liquid Glass
- iOS Frosted Glass
- Material You
- Alexa

### Home Assistant Integration

- HACS compatible
- Automatic sidebar registration
- Entity filtering and visibility management
- Local persistence
- Native Home Assistant entity/service helpers

### Administration

- Dedicated MHA Admin panel
- Per-user entity visibility
- Administrative controls for shared environments

---

## Installation

See:

- [Installation](docs/installation.md)

---

## Documentation

### User Documentation

- [Installation Guide](docs/installation.md)
- [User Guide](docs/user-guide.md)

### Developer Documentation

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Conventions](docs/conventions.md)
- [Pages](docs/pages.md)
- [Rendering pipeline](docs/rendering-pipeline.md)
- [Adding widgets](docs/adding-widgets.md)
- [Widgets](docs/widgets.md)
- [Themes](docs/themes.md)
- [Theme tokens](docs/theme-tokens.md)
- [Config flows](docs/config-flows.md)
- [Preview system](docs/preview-system.md)
- [Roadmap](docs/roadmap.md)
- [Release checklist](docs/release-checklist.md)

### Local Theme Studio

```bash
npm run theme-studio
```

Open `http://127.0.0.1:4173`. See [the dedicated Theme Studio guide](tools/theme-studio/README.md) for the audited architecture, safety guardrails and extension workflow.

---

## Current Project Status

MHA Widget Hub is currently a functional launcher platform featuring:

- Configurable widgets
- Responsive layouts
- Multi-page navigation
- Dedicated page experiences
- Administrative entity filtering
- Multiple visual systems
- Home Assistant integration
- Modular widget, panel, settings, layout, page and screensaver coordinators

The project is actively evolving toward a stable registry-driven architecture where widgets, themes and page experiences can be added with minimal central code changes.

---

## License

GPLv3
