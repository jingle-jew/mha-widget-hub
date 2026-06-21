"""WebSocket API for MHA entity visibility settings."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import (
    DEVICE_INSIGHTS_STORAGE_KEY,
    DEVICE_INSIGHTS_STORAGE_VERSION,
    DOMAIN,
    STORAGE_KEY,
    STORAGE_VERSION,
)

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
_DEVICE_INSIGHTS_STORE = "device_insights_store"
_MAX_DEVICE_ID_LENGTH = 96
_MAX_DEVICE_NAME_LENGTH = 80
_MAX_KIND_ITEMS = 32
_MAX_DOMAIN_ITEMS = 32
_MAX_COUNT = 10000


def _get_store(hass: HomeAssistant) -> Store[dict[str, Any]]:
    integration_data = hass.data.setdefault(DOMAIN, {})
    store = integration_data.get(_DATA_STORE)
    if store is None:
        store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        integration_data[_DATA_STORE] = store
    return store


def _get_device_insights_store(hass: HomeAssistant) -> Store[dict[str, Any]]:
    integration_data = hass.data.setdefault(DOMAIN, {})
    store = integration_data.get(_DEVICE_INSIGHTS_STORE)
    if store is None:
        store = Store(
            hass,
            DEVICE_INSIGHTS_STORAGE_VERSION,
            DEVICE_INSIGHTS_STORAGE_KEY,
        )
        integration_data[_DEVICE_INSIGHTS_STORE] = store
    return store


def _normalize_count(value: Any) -> int:
    try:
        count = int(value)
    except (TypeError, ValueError):
        return 0
    return max(0, min(count, _MAX_COUNT))


def _normalize_string(value: Any, *, fallback: str = "", max_length: int = 80) -> str:
    if not isinstance(value, str):
        return fallback
    stripped = value.strip()
    return stripped[:max_length] if stripped else fallback


def _normalize_count_map(value: Any, *, max_items: int) -> dict[str, int]:
    if not isinstance(value, dict):
        return {}

    normalized: dict[str, int] = {}
    for key, count in value.items():
        name = _normalize_string(key, max_length=64)
        if not name:
            continue
        normalized[name] = _normalize_count(count)
        if len(normalized) >= max_items:
            break
    return dict(sorted(normalized.items()))


def _utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _normalize_device_snapshot(value: Any, user_id: str) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None

    device_id = _normalize_string(
        value.get("device_id"),
        max_length=_MAX_DEVICE_ID_LENGTH,
    )
    if not device_id:
        return None

    theme = _normalize_string(value.get("theme"), fallback="unknown", max_length=24)
    theme_style = _normalize_string(
        value.get("theme_style"),
        fallback="unknown",
        max_length=32,
    )
    appearance_mode = _normalize_string(
        value.get("appearance_mode"),
        fallback="local",
        max_length=32,
    )
    frontend_version = _normalize_string(
        value.get("frontend_version"),
        fallback="dev",
        max_length=40,
    )

    return {
        "device_id": device_id,
        "device_name": _normalize_string(
            value.get("device_name"),
            fallback="MHA Device",
            max_length=_MAX_DEVICE_NAME_LENGTH,
        ),
        "user_id": user_id,
        "last_seen": _utc_now_iso(),
        "pages": _normalize_count(value.get("pages")),
        "widgets": _normalize_count(value.get("widgets")),
        "empty_pages": _normalize_count(value.get("empty_pages")),
        "configured_entities": _normalize_count(value.get("configured_entities")),
        "widget_kinds": _normalize_count_map(
            value.get("widget_kinds"),
            max_items=_MAX_KIND_ITEMS,
        ),
        "entity_domains": _normalize_count_map(
            value.get("entity_domains"),
            max_items=_MAX_DOMAIN_ITEMS,
        ),
        "theme": theme,
        "theme_style": theme_style,
        "appearance_mode": appearance_mode,
        "frontend_version": frontend_version,
    }


def _normalize_device_insights(value: Any) -> dict[str, Any]:
    devices = value.get("devices", {}) if isinstance(value, dict) else {}
    normalized_devices: dict[str, Any] = {}

    if isinstance(devices, dict):
        for device_id, snapshot in devices.items():
            normalized = _normalize_device_snapshot(
                {
                    **(snapshot if isinstance(snapshot, dict) else {}),
                    "device_id": device_id,
                },
                str(snapshot.get("user_id", "")) if isinstance(snapshot, dict) else "",
            )
            if normalized is not None:
                normalized["last_seen"] = _normalize_string(
                    snapshot.get("last_seen") if isinstance(snapshot, dict) else "",
                    fallback=normalized["last_seen"],
                    max_length=48,
                )
                normalized_devices[normalized["device_id"]] = normalized

    return {
        "version": DEVICE_INSIGHTS_STORAGE_VERSION,
        "devices": normalized_devices,
    }


async def _load_device_insights(hass: HomeAssistant) -> dict[str, Any]:
    stored = await _get_device_insights_store(hass).async_load()
    return _normalize_device_insights(stored)


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


@websocket_api.websocket_command(
    {vol.Required("type"): "mha_widget_hub/device_insights/get"}
)
@websocket_api.require_admin
@websocket_api.async_response
async def websocket_get_device_insights(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return opt-in MHA device insight snapshots to administrators."""
    config = await _load_device_insights(hass)
    devices = sorted(
        config["devices"].values(),
        key=lambda snapshot: snapshot.get("last_seen", ""),
        reverse=True,
    )
    connection.send_result(
        msg["id"],
        {"version": DEVICE_INSIGHTS_STORAGE_VERSION, "devices": devices},
    )


@websocket_api.websocket_command(
    {
        vol.Required("type"): "mha_widget_hub/device_insights/publish",
        vol.Required("snapshot"): dict,
    }
)
@websocket_api.async_response
async def websocket_publish_device_insights(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Persist the current user's opt-in snapshot for this device."""
    snapshot = _normalize_device_snapshot(msg["snapshot"], connection.user.id)
    if snapshot is None:
        connection.send_error(msg["id"], "invalid_snapshot", "Invalid device snapshot")
        return

    config = await _load_device_insights(hass)
    config["devices"][snapshot["device_id"]] = snapshot
    await _get_device_insights_store(hass).async_save(config)
    connection.send_result(msg["id"], snapshot)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "mha_widget_hub/device_insights/delete",
        vol.Required("device_id"): str,
    }
)
@websocket_api.async_response
async def websocket_delete_device_insights(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Remove the current user's opt-in snapshot for this device."""
    device_id = _normalize_string(
        msg.get("device_id"),
        max_length=_MAX_DEVICE_ID_LENGTH,
    )
    if not device_id:
        connection.send_error(msg["id"], "invalid_device_id", "Invalid device id")
        return

    config = await _load_device_insights(hass)
    existing = config["devices"].get(device_id)
    if existing and (connection.user.is_admin or existing.get("user_id") == connection.user.id):
        config["devices"].pop(device_id, None)
        await _get_device_insights_store(hass).async_save(config)

    connection.send_result(msg["id"], {"deleted": True, "device_id": device_id})


@callback
def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register the MHA WebSocket commands."""
    websocket_api.async_register_command(hass, websocket_get_entity_visibility)
    websocket_api.async_register_command(hass, websocket_save_entity_visibility)
    websocket_api.async_register_command(hass, websocket_list_users)
    websocket_api.async_register_command(hass, websocket_get_device_insights)
    websocket_api.async_register_command(hass, websocket_publish_device_insights)
    websocket_api.async_register_command(hass, websocket_delete_device_insights)
