import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NOTE:
// - If deploying to GitHub Pages under a repo subpath, set base to '/<REPO_NAME>/'.
//   Example: base: '/Initiate/'
// - For local dev, this works as-is.
export default defineConfig({
  plugins: [react()],
  base: './',
});
