import { getAvailableEntitiesForDomain } from "./entity-filters.js";

export function getAvailableMediaPlayers(hass, visibilityConfig) {
  return getAvailableEntitiesForDomain(hass, "media_player", visibilityConfig);
}

export function resolveEnabledMediaPlayerIds(config = {}, availablePlayers = []) {
  if (Array.isArray(config?.enabledPlayerIds)
    && (config.enabledPlayerIds.length || config.enabledPlayerIdsConfigured === true)) {
    return config.enabledPlayerIds.filter(Boolean);
  }
  return availablePlayers.map(player => player.entity_id);
}

export function resolveEnabledMediaPlayers(config = {}, availablePlayers = []) {
  const enabledIds = resolveEnabledMediaPlayerIds(config, availablePlayers);
  return availablePlayers.filter(player => enabledIds.includes(player.entity_id));
}

export function resolveSelectedMediaPlayerId(config = {}, players = []) {
  const ids = new Set(players.map(player => player.entity_id));
  if (config?.selectedPlayerId && ids.has(config.selectedPlayerId)) return config.selectedPlayerId;
  if (config?.defaultPlayerId && ids.has(config.defaultPlayerId)) return config.defaultPlayerId;
  return players[0]?.entity_id || "";
}
