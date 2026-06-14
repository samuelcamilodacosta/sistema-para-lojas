export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function setMessage(
  element: HTMLElement,
  text: string,
  type: 'success' | 'error' | 'none' = 'none',
): void {
  element.textContent = text;
  element.className = type === 'none' ? 'form-message' : `form-message ${type}`;
}
