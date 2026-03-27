export function shouldClearRejudgeNotice(isProcessing: boolean): boolean {
  return !isProcessing
}

export function getRejudgeButtonLabel(loading: boolean, isProcessing: boolean): string {
  if (loading) return '재판정 요청중...'
  if (isProcessing) return '재판정 진행중...'
  return '재판정'
}
