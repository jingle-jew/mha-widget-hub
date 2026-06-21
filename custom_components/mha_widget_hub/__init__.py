"""MHA Widget Hub integration."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from pathlib import Path
from typing import Any

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, STATIC_URL_PATH
from .panel_registry import (
    CONF_ENABLED_PANELS,
    PANEL_ADMIN,
    PANEL_DASHBOARD,
    async_register_enabled_panels,
    async_remove_registered_panels,
    get_registered_panel_url_paths,
    normalize_enabled_panels,
)
from .websocket import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

_DATA_STATIC_REGISTERED = "static_registered"
_DATA_WEBSOCKET_REGISTERED = "websocket_registered"
_LEGACY_ENABLED_PANELS = (PANEL_DASHBOARD, PANEL_ADMIN)


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the integration when sidebar module options change."""
    await hass.config_entries.async_reload(entry.entry_id)


def _get_entry_enabled_panels(entry: ConfigEntry) -> list[str]:
    """Return enabled panels for a config entry.

    Existing entries created before panel options existed keep the legacy
    dashboard + admin behavior until options are explicitly saved.
    """
    if CONF_ENABLED_PANELS in entry.options:
        return normalize_enabled_panels(entry.options.get(CONF_ENABLED_PANELS))

    if CONF_ENABLED_PANELS in entry.data:
        return normalize_enabled_panels(entry.data.get(CONF_ENABLED_PANELS))

    return normalize_enabled_panels(_LEGACY_ENABLED_PANELS)


async def _async_register_frontend(
    hass: HomeAssistant,
    enabled_panels: Iterable[str] | None = None,
) -> bool:
    """Serve the bundled frontend and register the MHA panels."""
    integration_data: dict[str, Any] = hass.data.setdefault(DOMAIN, {})
    frontend_dir = Path(__file__).parent / "frontend"

    if not await hass.async_add_executor_job(frontend_dir.is_dir):
        _LOGGER.error("Frontend directory is missing: %s", frontend_dir)
        return False

    if not integration_data.get(_DATA_STATIC_REGISTERED):
        await hass.http.async_register_static_paths(
            [
                StaticPathConfig(
                    STATIC_URL_PATH,
                    str(frontend_dir),
                    cache_headers=False,
                )
            ]
        )
        integration_data[_DATA_STATIC_REGISTERED] = True

    if not integration_data.get(_DATA_WEBSOCKET_REGISTERED):
        async_register_websocket_commands(hass)
        integration_data[_DATA_WEBSOCKET_REGISTERED] = True

    if not await async_register_enabled_panels(
        hass,
        integration_data,
        enabled_panels,
    ):
        return False

    registered_panels = get_registered_panel_url_paths(integration_data)
    _LOGGER.info(
        "MHA Widget Hub loaded: frontend %s, panels %s",
        STATIC_URL_PATH,
        ", ".join(f"/{panel}" for panel in registered_panels) or "none",
    )
    return True


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up MHA Widget Hub from YAML when configured."""
    if DOMAIN not in config:
        return True
    return await _async_register_frontend(hass, _LEGACY_ENABLED_PANELS)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up MHA Widget Hub from a config entry."""
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return await _async_register_frontend(hass, _get_entry_enabled_panels(entry))


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the MHA panels."""
    integration_data = hass.data.get(DOMAIN, {})
    async_remove_registered_panels(hass, integration_data)
    return True
