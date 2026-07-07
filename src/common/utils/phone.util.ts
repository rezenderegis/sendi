/**
 * Normaliza números brasileiros para o formato com 9º dígito.
 * O webhook do WhatsApp às vezes entrega números sem o 9 (12 dígitos: 55+DDD+8d).
 * O formato canônico é 13 dígitos: 55 + DDD + 9 + 8 dígitos.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length === 12) {
    return digits.slice(0, 4) + '9' + digits.slice(4);
  }
  return digits;
}

/** Retorna o formato alternativo (com ↔ sem 9º dígito) para lookup de fallback. */
export function phoneAlternative(phone: string): string | null {
  if (phone.startsWith('55')) {
    if (phone.length === 13) return phone.slice(0, 4) + phone.slice(5);
    if (phone.length === 12) return phone.slice(0, 4) + '9' + phone.slice(4);
  }
  return null;
}
