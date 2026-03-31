export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export function validatePasswordComplexity(password) {
  const value = String(password ?? '');

  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, reason: 'length' };
  }
  if (/\s/.test(value)) {
    return { ok: false, reason: 'whitespace' };
  }
  if (!/[A-Z]/.test(value)) {
    return { ok: false, reason: 'uppercase' };
  }
  if (!/[a-z]/.test(value)) {
    return { ok: false, reason: 'lowercase' };
  }
  if (!/\d/.test(value)) {
    return { ok: false, reason: 'digit' };
  }

  return { ok: true };
}

export function getPasswordComplexityErrorMessage(t, password) {
  const result = validatePasswordComplexity(password);
  if (result.ok) return '';

  switch (result.reason) {
    case 'length':
      return t('auth.passwordLength', 'Password must be 8–72 characters');
    case 'whitespace':
      return t('auth.passwordNoWhitespace', 'Password must not contain whitespace');
    case 'uppercase':
      return t(
        'auth.passwordMustContainUppercase',
        'Password must contain at least 1 uppercase letter'
      );
    case 'lowercase':
      return t(
        'auth.passwordMustContainLowercase',
        'Password must contain at least 1 lowercase letter'
      );
    case 'digit':
      return t('auth.passwordMustContainDigit', 'Password must contain at least 1 digit');
    default:
      return t('auth.passwordInvalid', 'Password is invalid');
  }
}

