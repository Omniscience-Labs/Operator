export const getAgentAvatar = (agentId: string) => {
  const avatars = ['🤖', '🎭', '🧠', '⚡', '🔥', '🌟', '🚀', '💎', '🎯', '🎪', '🎨', '🔮', '🌈', '⭐', '🎵'];
  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4'];
  const safeId = agentId || '';
  const avatarIndex = parseInt(safeId.slice(-2), 16) % avatars.length;
  const colorIndex = parseInt(safeId.slice(-3, -1), 16) % colors.length;
  return {
    avatar: avatars[isNaN(avatarIndex) ? 0 : avatarIndex] || '🤖',
    color: colors[isNaN(colorIndex) ? 0 : colorIndex] || '#3B82F6'
  };
};