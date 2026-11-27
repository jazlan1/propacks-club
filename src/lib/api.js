const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('pp_token') || '';
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function formatMoney(val) {
  const num = Number(val || 0);
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format cart items into a clean, paste-ready message for Signal or Telegram. */
export function formatCartOrderText({ cart = [], subtotal = 0, appliedCoupon = null, shippingEstimate = null, total = null }) {
  const lines = ['PRO PACKS ORDER', '------------------------'];
  let totalItems = 0;

  cart.forEach((item, idx) => {
    const qty = Number(item.quantity || 1);
    const unit = Number(item.price || 0);
    const lineTotal = unit * qty;
    totalItems += qty;
    const eachNote = qty > 1 ? ` (${formatMoney(unit)} each)` : '';
    lines.push(`${idx + 1}. ${item.name} [${item.variantLabel}] x${qty} - ${formatMoney(lineTotal)}${eachNote}`);
    if (item.sku) {
      lines.push(`   SKU: ${item.sku}`);
    }
  });

  lines.push('------------------------');
  lines.push(`Items: ${totalItems}`);
  lines.push(`Subtotal: ${formatMoney(subtotal)}`);

  if (appliedCoupon?.discount > 0) {
    lines.push(`Promo (${appliedCoupon.code}): -${formatMoney(appliedCoupon.discount)}`);
  }
  if (shippingEstimate !== null && shippingEstimate !== undefined) {
    lines.push(`Est. Shipping: ${shippingEstimate === 0 ? 'FREE' : formatMoney(shippingEstimate)}`);
  }
  lines.push(`Total: ${formatMoney(total !== null && total !== undefined ? total : subtotal)}`);
  lines.push('');
  lines.push('Payment Method: (CashApp / Zelle / ApplePay / Crypto)');
  lines.push('Shipping Name & Address:');

  return lines.join('\n');
}

/** Copy text to clipboard with fallback for in-app mobile browsers. */
export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy textarea copy
    }
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  return ok;
}
