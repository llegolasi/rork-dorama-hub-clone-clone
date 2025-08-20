export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'agora';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}sem`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mês${diffInMonths > 1 ? 'es' : ''}`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}ano${diffInYears > 1 ? 's' : ''}`;
};