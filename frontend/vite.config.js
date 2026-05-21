import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const srcLogo = "C:/Users/ASUS/.gemini/antigravity/brain/34c49ecb-87f6-47b9-828e-993b049f6623/ascent_logo_1779347700237.png";
const destDir = path.resolve(__dirname, 'public');

if (fs.existsSync(srcLogo)) {
  try {
    fs.copyFileSync(srcLogo, path.join(destDir, 'icon.png'));
    fs.copyFileSync(srcLogo, path.join(destDir, 'icon-192.png'));
    fs.copyFileSync(srcLogo, path.join(destDir, 'icon-512.png'));
    console.log("PWA Icons copied successfully via vite.config.js!");
  } catch (err) {
    console.error("Error copying PWA icons:", err);
  }
}

const srcDashboard = "C:/Users/ASUS/.gemini/antigravity/brain/34c49ecb-87f6-47b9-828e-993b049f6623/ascent_dashboard_mockup_1779350560132.png";
if (fs.existsSync(srcDashboard)) {
  try {
    fs.copyFileSync(srcDashboard, path.join(destDir, 'dashboard_mockup.png'));
    console.log("Dashboard mockup copied successfully!");
  } catch (err) {
    console.error("Error copying dashboard mockup:", err);
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
