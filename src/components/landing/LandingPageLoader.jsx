/**
 * Full-screen loader while welcome data and hero images load (after React mounts).
 * Pre-bundle: coin UI in index.html (#initial-app-loader). Loading copy: only index.html `LOADING` + `window.__portalLoadingLabel`.
 * Replace `LandingPageLoaderAnimation` for custom animation (Lottie, CSS, etc.).
 */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';

/** Label strings come only from index.html (window.__portalLoadingLabel). Fallback for non-browser tests. */
function getPortalLoadingLabel() {
  if (typeof window !== 'undefined' && window.__portalLoadingLabel != null) {
    return window.__portalLoadingLabel;
  }
  return 'Loading…';
}

/** Vector ψ (public/loader-psi.svg) — keep in sync with index.html shell loader */
const LOADER_PSI_SRC = '/loader-psi.svg';

const COIN_SIZE = 96;
const PSI_IMG_SIZE = 56;

/** Horizontal coin-flip (rotateY) — coin appears only after loader-psi.svg has loaded. */
export function LandingPageLoaderAnimation() {
  const imgRef = useRef(null);
  const [psiReady, setPsiReady] = useState(false);

  const revealCoin = () => setPsiReady(true);

  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setPsiReady(true);
    }
  }, []);

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
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          boxShadow: (theme) => `0 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)'}`,
          opacity: psiReady ? 1 : 0,
          transition: 'opacity 0.2s ease-out',
          animation: psiReady ? 'landingCoinFlipY 1.35s linear infinite' : 'none',
          '@keyframes landingCoinFlipY': {
            '0%': { transform: 'rotateY(0deg)' },
            '100%': { transform: 'rotateY(360deg)' },
          },
        }}
      >
        <Box
          component="img"
          ref={imgRef}
          src={LOADER_PSI_SRC}
          alt=""
          onLoad={revealCoin}
          onError={revealCoin}
          sx={{
            width: PSI_IMG_SIZE,
            height: PSI_IMG_SIZE,
            display: 'block',
            userSelect: 'none',
            pointerEvents: 'none',
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
      <Stack spacing={2} alignItems="center">
        <LandingPageLoaderAnimation />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500, letterSpacing: '0.02em' }}
        >
          {getPortalLoadingLabel()}
        </Typography>
      </Stack>
    </Box>
  );
}
