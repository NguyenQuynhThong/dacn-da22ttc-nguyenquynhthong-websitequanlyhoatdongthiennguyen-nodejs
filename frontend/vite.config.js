import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'views/index.html'),
        login: path.resolve(__dirname, 'views/login.html'),
        register: path.resolve(__dirname, 'views/register.html'),
        chienDich: path.resolve(__dirname, 'views/chien-dich.html'),
        chiTietChienDich: path.resolve(__dirname, 'views/chi-tiet-chien-dich.html'),
        toChuc: path.resolve(__dirname, 'views/to-chuc.html'),
        dashboardAdmin: path.resolve(__dirname, 'views/dashboard-admin.html'),
        dashboardToChuc: path.resolve(__dirname, 'views/dashboard-to-chuc.html'),
        profile: path.resolve(__dirname, 'views/profile.html'),
      }
    }
  },
  server: {
    port: 3000,
    open: '/views/index.html'
  }
});
