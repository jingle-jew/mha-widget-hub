"""Config flow for MHA Widget Hub."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.config_entries import ConfigEntry, OptionsFlowWithReload
from homeassistant.core import callback

from .const import DOMAIN
from .panel_registry import (
    CONF_ENABLED_PANELS,
    PANEL_ADMIN,
    PANEL_DASHBOARD,
    build_enabled_panels_from_options,
    iter_configurable_panel_definitions,
    normalize_enabled_panels,
)

_LEGACY_ENABLED_PANELS = (PANEL_DASHBOARD, PANEL_ADMIN)
_NEW_INSTALL_DEFAULT_ENABLED_PANELS = (PANEL_DASHBOARD,)


def _build_panel_options_schema(enabled_panels: list[str]) -> vol.Schema:
    """Build the sidebar module options schema."""
    enabled_panel_ids = set(enabled_panels)
    schema: dict[Any, Any] = {}

    for panel_id, _definition in iter_configurable_panel_definitions():
        schema[vol.Optional(panel_id, default=panel_id in enabled_panel_ids)] = bool

    return vol.Schema(schema)


def _get_entry_enabled_panels(entry: ConfigEntry) -> list[str]:
    """Return enabled panels for an existing config entry.

    Entries created before options existed keep the legacy dashboard + admin
    behavior until the user explicitly saves sidebar module options.
    """
    if CONF_ENABLED_PANELS in entry.options:
        return normalize_enabled_panels(entry.options.get(CONF_ENABLED_PANELS))

    if CONF_ENABLED_PANELS in entry.data:
        return normalize_enabled_panels(entry.data.get(CONF_ENABLED_PANELS))

    return normalize_enabled_panels(_LEGACY_ENABLED_PANELS)


class MhaWidgetHubConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Configure MHA Widget Hub."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: ConfigEntry,
    ) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return MhaWidgetHubOptionsFlow()

    async def async_step_user(self, user_input=None):
        """Create the single MHA Widget Hub config entry."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            enabled_panels = build_enabled_panels_from_options(user_input)
            return self.async_create_entry(
                title="MHA Widget Hub",
                data={},
                options={CONF_ENABLED_PANELS: enabled_panels},
            )

        return self.async_show_form(
            step_id="user",
            data_schema=_build_panel_options_schema(
                normalize_enabled_panels(_NEW_INSTALL_DEFAULT_ENABLED_PANELS),
            ),
        )


class MhaWidgetHubOptionsFlow(OptionsFlowWithReload):
    """Configure MHA Widget Hub options."""

    async def async_step_init(self, user_input=None):
        """Manage optional sidebar modules."""
        if user_input is not None:
            enabled_panels = build_enabled_panels_from_options(user_input)
            return self.async_create_entry(
                data={CONF_ENABLED_PANELS: enabled_panels},
            )

        return self.async_show_form(
            step_id="init",
            data_schema=_build_panel_options_schema(
                _get_entry_enabled_panels(self.config_entry),
            ),
        )
