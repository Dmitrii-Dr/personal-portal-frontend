import Box from '@mui/material/Box';

/**
 * B17 — favicon from b17.ru (same as previous ContactPlatformIcon implementation).
 * Uses 1em sizing so `sx={{ fontSize }}` matches other MUI icons.
 */
export default function B17Icon({ sx, ...other }) {
  return (
    <Box
      component="img"
      src="https://www.b17.ru/favicon.ico"
      alt="B17"
      data-testid="B17Icon"
      sx={[
        {
          display: 'block',
          width: '1em',
          height: '1em',
          objectFit: 'contain',
          filter: 'brightness(0) invert(1)',
        },
        sx,
      ]}
      onError={(e) => {
        e.target.style.display = 'none';
        const parent = e.target.parentElement;
        if (parent && !parent.querySelector('.b17-fallback')) {
          const fallback = document.createElement('span');
          fallback.className = 'b17-fallback';
          fallback.textContent = 'B17';
          fallback.style.cssText =
            'font-size: 18px; font-weight: bold; color: white; display: flex; align-items: center; justify-content: center;';
          parent.appendChild(fallback);
        }
      }}
      {...other}
    />
  );
}
