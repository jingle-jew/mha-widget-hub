"""Declarative sidebar panel registry for MHA Widget Hub.

This module prepares the backend shape for future optional sidebar modules.
It intentionally does not register or unregister panels by itself.
"""

from __future__ import annotations

from collections.abc import Iterable
from copy import deepcopy
from typing import Any

PANEL_DASHBOARD = "dashboard"
PANEL_ADMIN = "admin"
PANEL_THEME_BUILDER = "theme_builder"
PANEL_DIAGNOSTICS = "diagnostics"

CONF_ENABLED_PANELS = "enabled_panels"

MHA_PANELS: dict[str, dict[str, Any]] = {
    PANEL_DASHBOARD: {
        "title": "MHA Widget Hub",
        "icon": "mdi:view-dashboard",
        "url_path": "mha-widget-hub",
        "module_url": "/mha-widget-hub/frontend/mha-widget-hub.js",
        "default_enabled": True,
    },
    PANEL_ADMIN: {
        "title": "MHA Admin",
        "icon": "mdi:shield-account",
        "url_path": "mha-admin",
        "module_url": "/mha-widget-hub/frontend/mha-admin.js",
        "default_enabled": False,
    },
    PANEL_THEME_BUILDER: {
        "title": "MHA Theme Builder",
        "icon": "mdi:palette",
        "url_path": "mha-theme-builder",
        "module_url": "/mha-widget-hub/frontend/mha-theme-builder.js",
        "default_enabled": False,
    },
    PANEL_DIAGNOSTICS: {
        "title": "MHA Diagnostics",
        "icon": "mdi:bug-check",
        "url_path": "mha-diagnostics",
        "module_url": "/mha-widget-hub/frontend/mha-diagnostics.js",
        "default_enabled": False,
    },
}


def get_default_enabled_panels() -> list[str]:
    """Return panel IDs enabled by default, preserving declaration order."""
    return [
        panel_id
        for panel_id, definition in MHA_PANELS.items()
        if definition.get("default_enabled")
    ]


def normalize_enabled_panels(enabled_panels: Iterable[str] | None) -> list[str]:
    """Return a stable list of known enabled panel IDs.

    Unknown IDs are ignored. If no known panel remains, default-enabled panels
    are returned instead.
    """
    if enabled_panels is None:
        return get_default_enabled_panels()

    requested = set(enabled_panels)
    normalized = [
        panel_id
        for panel_id in MHA_PANELS
        if panel_id in requested
    ]

    return normalized or get_default_enabled_panels()


def get_panel_definition(panel_id: str) -> dict[str, Any] | None:
    """Return a copy of a panel definition, or None for unknown IDs."""
    definition = MHA_PANELS.get(panel_id)

    if definition is None:
        return None

    return deepcopy(definition)


def iter_enabled_panel_definitions(
    enabled_panels: Iterable[str] | None,
) -> list[tuple[str, dict[str, Any] | None]]:
    """Return enabled panel definitions, preserving registry order."""
    return [
        (panel_id, get_panel_definition(panel_id))
        for panel_id in normalize_enabled_panels(enabled_panels)
    ]
