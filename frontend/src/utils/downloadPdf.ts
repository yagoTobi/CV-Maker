/**
 * Converts a base64-encoded PDF string to a Blob and triggers a browser download.
 *
 * Used by DirectEditPage and Dashboard wherever PDF compilation results need
 * to be saved to disk.
 */
export function downloadPdf(base64: string, filename: string): void {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
