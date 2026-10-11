export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Promise.resolve(successful);
  } catch (err) {
    return Promise.resolve(false);
  }
}

export function downloadText(filename: string, text: string) {
  const element = document.createElement('a');
  const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function formatDate(isoStr?: string): string {
  if (!isoStr) return 'N/A';
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function formatHostsCount(val?: string | number): string {
  if (!val) return '1';
  if (typeof val === 'number') return val.toLocaleString();
  const trimmed = String(val).trim();
  try {
    if (/^\d+$/.test(trimmed)) {
      return BigInt(trimmed).toLocaleString();
    }
  } catch {
    // fallback
  }
  return trimmed;
}

export function estimateCidrCapacity(cidr?: string, fallbackHosts?: string): string {
  if (fallbackHosts && fallbackHosts !== '1') {
    return formatHostsCount(fallbackHosts);
  }
  if (!cidr || !cidr.includes('/')) {
    return formatHostsCount(fallbackHosts || '1');
  }
  const parts = cidr.split('/');
  const prefix = parseInt(parts[1], 10);
  if (isNaN(prefix)) {
    return formatHostsCount(fallbackHosts || '1');
  }
  if (!cidr.includes(':')) {
    // IPv4
    if (prefix >= 0 && prefix <= 32) {
      if (prefix === 32) return '1';
      if (prefix === 31) return '2';
      const total = 2 ** (32 - prefix);
      return (total - 2).toLocaleString();
    }
  } else {
    // IPv6
    if (prefix >= 0 && prefix <= 128) {
      return `2^${128 - prefix}`;
    }
  }
  return formatHostsCount(fallbackHosts || '1');
}

