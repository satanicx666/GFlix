export function canWatch(profile: { is_banned: boolean } | null) {
  return !profile?.is_banned;
}

export function canUseServer(server: { is_active: boolean }) {
  return server.is_active;
}