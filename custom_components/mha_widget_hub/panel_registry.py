"""Declarative sidebar panel registry for MHA Widget Hub.

This module centralizes Home Assistant sidebar panel metadata and provides
small helpers for registering the currently enabled panels.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable
from copy import deepcopy
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.core import HomeAssistant

from .const import (
    ADMIN_FRONTEND_MODULE,
    ADMIN_PANEL_COMPONENT,
    ADMIN_PANEL_ICON,
    ADMIN_PANEL_TITLE,
    ADMIN_PANEL_URL_PATH,
    FRONTEND_MODULE,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STATIC_URL_PATH,
    VERSION,
)

_LOGGER = logging.getLogger(__name__)

PANEL_DASHBOARD = "dashboard"
PANEL_ADMIN = "admin"
PANEL_THEME_BUILDER = "theme_builder"
PANEL_DIAGNOSTICS = "diagnostics"

CONF_ENABLED_PANELS = "enabled_panels"
DATA_REGISTERED_PANELS = "registered_panels"

MHA_PANELS: dict[str, dict[str, Any]] = {
    PANEL_DASHBOARD: {
        "title": PANEL_TITLE,
        "icon": PANEL_ICON,
        "url_path": PANEL_URL_PATH,
        "webcomponent_name": PANEL_COMPONENT,
        "module_url": f"{STATIC_URL_PATH}/{FRONTEND_MODULE}?v={VERSION}",
        "require_admin": False,
        "default_enabled": True,
        "available": True,
        "configurable": False,
    },
    PANEL_ADMIN: {
        "title": ADMIN_PANEL_TITLE,
        "icon": ADMIN_PANEL_ICON,
        "url_path": ADMIN_PANEL_URL_PATH,
        "webcomponent_name": ADMIN_PANEL_COMPONENT,
        "module_url": f"{STATIC_URL_PATH}/{ADMIN_FRONTEND_MODULE}?v={VERSION}",
        "require_admin": True,
        "default_enabled": False,
        "available": True,
        "configurable": True,
    },
    PANEL_THEME_BUILDER: {
        "title": "MHA Theme Builder",
        "icon": "mdi:palette",
        "url_path": "mha-theme-builder",
        "webcomponent_name": "mha-theme-builder",
        "module_url": f"{STATIC_URL_PATH}/mha-theme-builder-loader.js?v={VERSION}",
        "require_admin": True,
        "default_enabled": False,
        "available": False,
        "configurable": True,
    },
    PANEL_DIAGNOSTICS: {
        "title": "MHA Insights",
        "icon": "mdi:chart-box-outline",
        "url_path": "mha-diagnostics",
        "webcomponent_name": "mha-diagnostics-panel",
        "module_url": f"{STATIC_URL_PATH}/mha-diagnostics-loader.js?v={VERSION}",
        "require_admin": True,
        "default_enabled": False,
        "available": True,
        "configurable": True,
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
) -> list[tuple[str, dict[str, Any]]]:
    """Return enabled panel definitions, preserving registry order."""
    panel_definitions: list[tuple[str, dict[str, Any]]] = []

    for panel_id in normalize_enabled_panels(enabled_panels):
        definition = get_panel_definition(panel_id)
        if definition is not None:
            panel_definitions.append((panel_id, definition))

    return panel_definitions


def iter_configurable_panel_definitions() -> list[tuple[str, dict[str, Any]]]:
    """Return panels that can be toggled from config/options flows."""
    panel_definitions: list[tuple[str, dict[str, Any]]] = []

    for panel_id, definition in MHA_PANELS.items():
        if not definition.get("available", True):
            continue
        if not definition.get("configurable", True):
            continue
        panel_definitions.append((panel_id, deepcopy(definition)))

    return panel_definitions


def build_enabled_panels_from_options(
    user_input: dict[str, Any] | None,
) -> list[str]:
    """Build the enabled panel list from config/options form data.

    The dashboard remains mandatory in this phase. Optional extension panels are
    appended in registry order when selected.
    """
    enabled_panels = [PANEL_DASHBOARD]

    if not user_input:
        return enabled_panels

    for panel_id, _definition in iter_configurable_panel_definitions():
        if user_input.get(panel_id):
            enabled_panels.append(panel_id)

    return normalize_enabled_panels(enabled_panels)


def _get_registered_panel_ids(integration_data: dict[str, Any]) -> set[str]:
    """Return the set of panel IDs registered during this runtime."""
    registered = integration_data.setdefault(DATA_REGISTERED_PANELS, set())

    if isinstance(registered, set):
        return registered

    registered_panel_ids = set(registered)
    integration_data[DATA_REGISTERED_PANELS] = registered_panel_ids
    return registered_panel_ids


async def async_register_enabled_panels(
    hass: HomeAssistant,
    integration_data: dict[str, Any],
    enabled_panels: Iterable[str] | None,
) -> bool:
    """Register enabled MHA sidebar panels.

    Unavailable future panels are ignored until their frontend entrypoints exist.
    """
    registered_panel_ids = _get_registered_panel_ids(integration_data)

    try:
        for panel_id, definition in iter_enabled_panel_definitions(enabled_panels):
            if not definition.get("available", True):
                continue

            if panel_id in registered_panel_ids:
                continue

            await async_register_panel(
                hass,
                frontend_url_path=definition["url_path"],
                webcomponent_name=definition["webcomponent_name"],
                sidebar_title=definition["title"],
                sidebar_icon=definition["icon"],
                module_url=definition["module_url"],
                require_admin=definition["require_admin"],
            )
            registered_panel_ids.add(panel_id)
    except ValueError as err:
        _LOGGER.error("Cannot register MHA panels: %s", err)
        return False

    return True


def get_registered_panel_url_paths(integration_data: dict[str, Any]) -> list[str]:
    """Return registered panel URL paths, preserving registry order."""
    registered_panel_ids = _get_registered_panel_ids(integration_data)
    url_paths: list[str] = []

    for panel_id, definition in MHA_PANELS.items():
        if panel_id not in registered_panel_ids:
            continue
        url_paths.append(definition["url_path"])

    return url_paths


def async_remove_registered_panels(
    hass: HomeAssistant,
    integration_data: dict[str, Any],
) -> None:
    """Remove panels registered during this runtime."""
    registered_panel_ids = _get_registered_panel_ids(integration_data)

    for panel_id in list(registered_panel_ids):
        definition = MHA_PANELS.get(panel_id)
        if definition is None:
            continue
        frontend.async_remove_panel(hass, definition["url_path"])

    registered_panel_ids.clear()
