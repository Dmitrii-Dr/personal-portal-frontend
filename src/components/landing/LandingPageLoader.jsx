/**
 * Full-screen loader while welcome data and hero images load (after React mounts).
 * Pre-bundle: coin UI in index.html (#initial-app-loader). Loading copy: only index.html `LOADING` + `window.__portalLoadingLabel`.
 * Coin + ψ are a single raster from public/loader-psi.svg (no separate teal layer vs glyph).
 */
import React, { useMemo } from 'react';
import { Box, Stack } from '@mui/material';

/** Must match index.html @keyframes duration and COIN_FLIP_DURATION_MS in shell script */
export const COIN_FLIP_DURATION_S = 1.35;
export const COIN_FLIP_DURATION_MS = COIN_FLIP_DURATION_S * 1000;

/** Label strings come only from index.html (window.__portalLoadingLabel). Fallback for non-browser tests. */
function getPortalLoadingLabel() {
  if (typeof window !== 'undefined' && window.__portalLoadingLabel != null) {
    return window.__portalLoadingLabel;
  }
  return 'Loading…';
}

const LOADER_MARK_SRC = '/loader-psi.svg';
const COIN_SIZE = 96;

/**
 * Negative delay aligns rotation phase with performance.now() — same rule as index.html shell
 * so the shell → React handoff does not reset the spin (avoids twitch).
 */
function useCoinFlipAnimationDelay() {
  return useMemo(() => {
    if (typeof performance === 'undefined') return '0ms';
    return `-${performance.now() % COIN_FLIP_DURATION_MS}ms`;
  }, []);
}

/** Horizontal coin-flip on wrapper (matches shell: .initial-app-loader__coin rotates, img static). */
export function LandingPageLoaderAnimation() {
  const animationDelay = useCoinFlipAnimationDelay();

  return (
    <Box
      aria-hidden
      sx={{
        width: COIN_SIZE,
        height: COIN_SIZE,
        perspective: '320px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: COIN_SIZE,
          height: COIN_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          animation: `landingCoinFlipY ${COIN_FLIP_DURATION_S}s linear infinite`,
          animationDelay,
          animationFillMode: 'both',
          '@keyframes landingCoinFlipY': {
            '0%': { transform: 'rotateY(0deg) translateZ(0.1px)' },
            '100%': { transform: 'rotateY(360deg) translateZ(0.1px)' },
          },
        }}
      >
        <Box
          component="img"
          src={LOADER_MARK_SRC}
          alt=""
          sx={{
            width: COIN_SIZE,
            height: COIN_SIZE,
            display: 'block',
            borderRadius: '50%',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.12))',
            userSelect: 'none',
            pointerEvents: 'none',
            flexShrink: 0,
          }}
        />
      </Box>
    </Box>
  );
}

export default function LandingPageLoader() {
  return (
    <Box
      role="status"
      aria-busy="true"
      aria-live="polite"
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F0F7F7',
      }}
    >
      <Stack direction="column" alignItems="center" sx={{ gap: '20px' }}>
        <LandingPageLoaderAnimation />
        <Box
          component="p"
          sx={{
            m: 0,
            /* Match #initial-app-loader .initial-app-loader__label — avoid MUI theme font (Roboto) swap reflow */
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '0.875rem',
            fontWeight: 500,
            letterSpacing: '0.02em',
            lineHeight: 1.43,
            color: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          {getPortalLoadingLabel()}
        </Box>
      </Stack>
    </Box>
  );
}
