import React from 'react';
import {
  TelegramIcon,
  LinkedInIcon,
  GitHubIcon,
  EmailIcon,
  LanguageIcon,
  PhoneIcon,
  InstagramIcon,
  TwitterIcon,
  FacebookIcon,
  YouTubeIcon,
} from './muiContact';
import VkIcon from './VkIcon';
import WhatsAppIcon from './WhatsAppIcon';
import B17Icon from './B17Icon';

/**
 * Shared platform glyph for contact links (landing grid, admin preview, admin Select).
 *
 * @param {object} props
 * @param {string} [props.platform] — e.g. "Telegram", "VK.com"
 * @param {number | { xs?: number, sm?: number, md?: number }} [props.fontSize] — fixed number (e.g. 20 for menus) or responsive object for footer grid
 */
export function ContactPlatformIcon({ platform, fontSize = 20 }) {
  const iconSx = { fontSize };

  const platformLower = (platform || '').toLowerCase();
  switch (platformLower) {
    case 'telegram':
      return <TelegramIcon sx={iconSx} />;
    case 'linkedin':
      return <LinkedInIcon sx={iconSx} />;
    case 'github':
      return <GitHubIcon sx={iconSx} />;
    case 'email':
      return <EmailIcon sx={iconSx} />;
    case 'phone':
      return <PhoneIcon sx={iconSx} />;
    case 'instagram':
      return <InstagramIcon sx={iconSx} />;
    case 'twitter':
      return <TwitterIcon sx={iconSx} />;
    case 'facebook':
      return <FacebookIcon sx={iconSx} />;
    case 'youtube':
      return <YouTubeIcon sx={iconSx} />;
    case 'whatsapp':
      return <WhatsAppIcon sx={iconSx} />;
    case 'website':
      return <LanguageIcon sx={iconSx} />;
    case 'vk':
    case 'vk.com':
      return <VkIcon sx={iconSx} />;
    case 'b17':
      return <B17Icon sx={iconSx} />;
    default:
      return <LanguageIcon sx={iconSx} />;
  }
}
