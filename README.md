# Personal Portal Frontend

A professional's personal website built with React and Material-UI.

## Features

- Responsive layout with MUI AppBar
- Navigation with react-router-dom
- Simulated authentication state
- Modern, professional UI

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```
src/
  components/
    AppLayout.jsx  # Main layout component
  App.jsx          # Main app component with routing
  main.jsx         # Entry point
```

## Components

### AppLayout

The main layout component that provides:
- Top navigation bar with branding
- Dynamic navigation links based on auth state
- Content area for page content
- Temporary auth toggle button for development

## Docker

To build and run the application inside a container:

```bash
# Build the image
docker build -t personal-portal-frontend .

# Run the container (exposes Vite preview on port 4173)
docker run -p 4173:4173 personal-portal-frontend
```

Then open http://localhost:4173 in your browser.

### Docker Compose

A `docker-compose.yml` is provided to build the frontend image and set `VITE_BACKEND_HOST=personal-portal-be` during the build so the bundle points at your backend container on the shared `personal-portal-network`.

```bash
# Start services (rebuilds the image so Vite picks up env vars)
docker-compose up --build

# Stop services
docker-compose down
```

Make sure you have a backend container reachable as `personal-portal-be` on the same network (or adjust the hostname in `docker-compose.yml`).

