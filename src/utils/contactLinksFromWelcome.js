/** Default contact links when welcome API has no `contact` array. */
export const DEFAULT_CONTACT_LINKS = [
  {
    platform: 'Telegram',
    value: 'https://t.me/example',
    description: 'Telegram',
  },
  {
    platform: 'LinkedIn',
    value: 'https://www.linkedin.com/in/example',
    description: 'LinkedIn',
  },
  {
    platform: 'GitHub',
    value: 'https://github.com/example',
    description: 'GitHub',
  },
  {
    platform: 'Email',
    value: 'mailto:contact@example.com',
    description: 'Email',
  },
];

/**
 * @param {{ contact?: Array<{ platform?: string, value: string, description?: string }> } | null | undefined} data
 * @returns {Array<{ platform?: string, value: string, description?: string }>}
 */
export function contactLinksFromWelcome(data) {
  if (data?.contact && Array.isArray(data.contact)) {
    return data.contact;
  }
  return DEFAULT_CONTACT_LINKS;
}
