"""WebSocket API for MHA entity visibility settings."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORAGE_KEY, STORAGE_VERSION

ALLOWED_DOMAINS = {
    "light",
    "switch",
    "input_boolean",
    "weather",
    "media_player",
    "climate",
    "sensor",
    "binary_sensor",
}

_DATA_STORE = "entity_visibility_store"


def _get_store(hass: HomeAssistant) -> Store[dict[str, Any]]:
    integration_data = hass.data.setdefault(DOMAIN, {})
    store = integration_data.get(_DATA_STORE)
    if store is None:
        store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        integration_data[_DATA_STORE] = store
    return store


def _normalize_config(value: Any) -> dict[str, Any]:
    """Keep only stable user IDs, supported domains, and matching entity IDs."""
    users = value.get("users", {}) if isinstance(value, dict) else {}
    normalized_users: dict[str, Any] = {}

    for user_id, user_config in users.items():
        if not isinstance(user_id, str) or not isinstance(user_config, dict):
            continue

        unrestricted = bool(user_config.get("unrestricted", True))
        allowed = user_config.get("allowedEntities", {})
        normalized_allowed: dict[str, list[str]] = {}

        if isinstance(allowed, dict):
            for domain in ALLOWED_DOMAINS:
                entity_ids = allowed.get(domain, [])
                if not isinstance(entity_ids, list):
                    continue
                normalized_allowed[domain] = sorted(
                    {
                        entity_id
                        for entity_id in entity_ids
                        if isinstance(entity_id, str)
                        and entity_id.startswith(f"{domain}.")
                    }
                )

        normalized_users[user_id] = {
            "unrestricted": unrestricted,
            "allowedEntities": normalized_allowed,
        }

    return {"version": STORAGE_VERSION, "users": normalized_users}


async def _load_config(hass: HomeAssistant) -> dict[str, Any]:
    stored = await _get_store(hass).async_load()
    return _normalize_config(stored)


@websocket_api.websocket_command(
    {vol.Required("type"): "mha_widget_hub/entity_visibility/get"}
)
@websocket_api.async_response
async def websocket_get_entity_visibility(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return MHA visibility settings to an authenticated HA user."""
    config = await _load_config(hass)
    if not connection.user.is_admin:
        user_config = config["users"].get(connection.user.id)
        config = {
            "version": STORAGE_VERSION,
            "users": (
                {connection.user.id: user_config}
                if user_config is not None
                else {}
            ),
        }
    connection.send_result(msg["id"], config)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "mha_widget_hub/entity_visibility/save",
        vol.Required("config"): dict,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_save_entity_visibility(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Persist MHA visibility settings. Admin access is mandatory."""
    config = _normalize_config(msg["config"])
    await _get_store(hass).async_save(config)
    connection.send_result(msg["id"], config)


@websocket_api.websocket_command(
    {vol.Required("type"): "mha_widget_hub/users/list"}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_list_users(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """List stable Home Assistant user IDs for the MHA admin panel."""
    users = [
        {
            "id": user.id,
            "name": user.name or "Utilisateur Home Assistant",
            "is_admin": user.is_admin,
            "is_active": user.is_active,
            "system_generated": user.system_generated,
        }
        for user in await hass.auth.async_get_users()
        if user.is_active and not user.system_generated
    ]
    users.sort(key=lambda user: user["name"].casefold())
    connection.send_result(msg["id"], {"users": users})


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register the MHA WebSocket commands."""
    websocket_api.async_register_command(hass, websocket_get_entity_visibility)
    websocket_api.async_register_command(hass, websocket_save_entity_visibility)
    websocket_api.async_register_command(hass, websocket_list_users)
