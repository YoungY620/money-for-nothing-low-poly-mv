# Money for Nothing — Low-poly MV

An interactive Three.js tribute to Dire Straits' animated **Money for Nothing** video. All models, scenes, camera moves, and CRT effects are generated in code.

## Features

- A complete 278.93-second timeline with 18 chapters
- Low-poly appliance movers, a band, kitchens, and a television wall
- Audio-reactive lighting driven by a sampled volume envelope
- Play, pause, seek, mute, fullscreen, and keyboard controls
- Responsive layout and reduced-motion rendering adjustments

## Run

```sh
npm ci
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

The production site is generated in `dist/`. GitHub Pages is deployed by the included GitHub Actions workflow.

## Controls

- Space: play or pause
- Left and right arrows: seek five seconds
- M: mute or unmute
- F: enter or exit fullscreen

This is an unofficial fan-made visualization. Audio and composition rights remain with their respective rightsholders.
