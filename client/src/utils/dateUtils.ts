/**
 * 날짜를 YYYY-MM-DD HH:MM 형식으로 포맷팅합니다.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 날짜를 상대적인 시간 형식으로 표시합니다. (예: '1분 전', '3시간 전', '어제', '3일 전')
 */
export function relativeTimeFormat(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSecs < 60) {
    return '방금 전';
  } else if (diffInMins < 60) {
    return `${diffInMins}분 전`;
  } else if (diffInHours < 24) {
    return `${diffInHours}시간 전`;
  } else if (diffInDays === 1) {
    return '어제';
  } else if (diffInDays < 30) {
    return `${diffInDays}일 전`;
  } else {
    return formatDate(date);
  }
} 