"""Config flow for MHA Widget Hub."""

from __future__ import annotations

import voluptuous as vol

from homeassistant import config_entries

from .const import DOMAIN


class MhaWidgetHubConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Configure MHA Widget Hub."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Create the single MHA Widget Hub config entry."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title="MHA Widget Hub", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
        )

