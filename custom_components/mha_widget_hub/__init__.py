"""MHA Widget Hub integration."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, STATIC_URL_PATH
from .panel_registry import (
    PANEL_ADMIN,
    PANEL_DASHBOARD,
    async_register_enabled_panels,
    async_remove_registered_panels,
    get_registered_panel_url_paths,
)
from .websocket import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

_DATA_STATIC_REGISTERED = "static_registered"
_DATA_WEBSOCKET_REGISTERED = "websocket_registered"
_CURRENT_ENABLED_PANELS = (PANEL_DASHBOARD, PANEL_ADMIN)


async def _async_register_frontend(hass: HomeAssistant) -> bool:
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
        _CURRENT_ENABLED_PANELS,
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
    return await _async_register_frontend(hass)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up MHA Widget Hub from a config entry."""
    return await _async_register_frontend(hass)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the MHA panels."""
    integration_data = hass.data.get(DOMAIN, {})
    async_remove_registered_panels(hass, integration_data)
    return True
