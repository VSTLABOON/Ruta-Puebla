import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  },
  preview: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) {
            return 'vendor-maplibre';
          }
          if (id.includes('@supabase/supabase-js')) {
            return 'vendor-supabase';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
});
