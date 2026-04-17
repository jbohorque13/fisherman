/** Formatea un input de texto como número internacional: +XX XXX XXX XXXX */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (!digits) return '+'
  if (digits.length <= 2) return `+${digits}`
  if (digits.length <= 5) return `+${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)} ${digits.slice(9)}`
}

/** Valida que el teléfono tenga al menos 10 dígitos */
export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length >= 10
}
