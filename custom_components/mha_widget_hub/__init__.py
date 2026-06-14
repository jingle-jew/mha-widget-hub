"""MHA Widget Hub integration."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.panel_custom import async_register_panel
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import (
    ADMIN_FRONTEND_MODULE,
    ADMIN_PANEL_COMPONENT,
    ADMIN_PANEL_ICON,
    ADMIN_PANEL_TITLE,
    ADMIN_PANEL_URL_PATH,
    DOMAIN,
    FRONTEND_MODULE,
    PANEL_COMPONENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STATIC_URL_PATH,
    VERSION,
)
from .websocket import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

_DATA_PANEL_REGISTERED = "panel_registered"
_DATA_ADMIN_PANEL_REGISTERED = "admin_panel_registered"
_DATA_STATIC_REGISTERED = "static_registered"
_DATA_WEBSOCKET_REGISTERED = "websocket_registered"


async def _async_register_frontend(hass: HomeAssistant) -> bool:
    """Serve the bundled frontend and register the MHA panel."""
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

    if (
        integration_data.get(_DATA_PANEL_REGISTERED)
        and integration_data.get(_DATA_ADMIN_PANEL_REGISTERED)
    ):
        return True

    try:
        if not integration_data.get(_DATA_PANEL_REGISTERED):
            await async_register_panel(
                hass,
                frontend_url_path=PANEL_URL_PATH,
                webcomponent_name=PANEL_COMPONENT,
                sidebar_title=PANEL_TITLE,
                sidebar_icon=PANEL_ICON,
                module_url=f"{STATIC_URL_PATH}/{FRONTEND_MODULE}?v={VERSION}",
                require_admin=False,
            )
            integration_data[_DATA_PANEL_REGISTERED] = True

        if not integration_data.get(_DATA_ADMIN_PANEL_REGISTERED):
            await async_register_panel(
                hass,
                frontend_url_path=ADMIN_PANEL_URL_PATH,
                webcomponent_name=ADMIN_PANEL_COMPONENT,
                sidebar_title=ADMIN_PANEL_TITLE,
                sidebar_icon=ADMIN_PANEL_ICON,
                module_url=(
                    f"{STATIC_URL_PATH}/{ADMIN_FRONTEND_MODULE}?v={VERSION}"
                ),
                require_admin=True,
            )
            integration_data[_DATA_ADMIN_PANEL_REGISTERED] = True
    except ValueError as err:
        _LOGGER.error(
            "Cannot register MHA panels: %s",
            err,
        )
        return False

    _LOGGER.info(
        "MHA Widget Hub loaded: frontend %s, panels /%s and /%s",
        STATIC_URL_PATH,
        PANEL_URL_PATH,
        ADMIN_PANEL_URL_PATH,
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
    """Unload the MHA panel."""
    integration_data = hass.data.get(DOMAIN, {})
    if integration_data.get(_DATA_PANEL_REGISTERED):
        frontend.async_remove_panel(hass, PANEL_URL_PATH)
        integration_data[_DATA_PANEL_REGISTERED] = False
    if integration_data.get(_DATA_ADMIN_PANEL_REGISTERED):
        frontend.async_remove_panel(hass, ADMIN_PANEL_URL_PATH)
        integration_data[_DATA_ADMIN_PANEL_REGISTERED] = False
    return True
