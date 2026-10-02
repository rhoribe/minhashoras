import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function getPngDimensions(filePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(filePath);
  // PNG signature check
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) {
    throw new Error(`File at ${filePath} is not a valid PNG`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe('PWA Manifest & Icon Assets Compliance (Feature 006)', () => {
  const rootDir = process.cwd();
  const iconsDir = path.resolve(rootDir, 'client/public/icons');

  describe('User Story 1 & 3: Icon Assets Dimensions and Integrity', () => {
    it('icon-192x192.png has exact 192x192 dimensions', () => {
      const iconPath = path.resolve(iconsDir, 'icon-192x192.png');
      expect(fs.existsSync(iconPath)).toBe(true);

      const { width, height } = getPngDimensions(iconPath);
      expect(width).toBe(192);
      expect(height).toBe(192);
    });

    it('icon-512x512.png has exact 512x512 dimensions', () => {
      const iconPath = path.resolve(iconsDir, 'icon-512x512.png');
      expect(fs.existsSync(iconPath)).toBe(true);

      const { width, height } = getPngDimensions(iconPath);
      expect(width).toBe(512);
      expect(height).toBe(512);
    });

    it('icon-maskable-512x512.png has exact 512x512 dimensions for Android adaptive icon', () => {
      const iconPath = path.resolve(iconsDir, 'icon-maskable-512x512.png');
      expect(fs.existsSync(iconPath)).toBe(true);

      const { width, height } = getPngDimensions(iconPath);
      expect(width).toBe(512);
      expect(height).toBe(512);
    });

    it('apple-touch-icon.png exists for iOS compatibility', () => {
      const iconPath = path.resolve(iconsDir, 'apple-touch-icon.png');
      expect(fs.existsSync(iconPath)).toBe(true);

      const { width, height } = getPngDimensions(iconPath);
      expect(width).toBe(180);
      expect(height).toBe(180);
    });
  });

  describe('User Story 1: HTML Head and Meta Tags for PWA Installability', () => {
    it('index.html contains apple-touch-icon link and mobile-web-app-capable meta tag', () => {
      const htmlPath = path.resolve(rootDir, 'client/index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      expect(html).toContain('name="theme-color"');
      expect(html).toContain('apple-mobile-web-app-capable');
      expect(html).toContain('apple-touch-icon');
      expect(html).toContain('mobile-web-app-capable');
    });
  });

  describe('User Story 1 & 3: Vite PWA Manifest Configuration', () => {
    it('vite.config.ts configures id, lang, start_url, and maskable icons', () => {
      const viteConfigPath = path.resolve(rootDir, 'client/vite.config.ts');
      const configText = fs.readFileSync(viteConfigPath, 'utf-8');

      expect(configText).toContain("id: '/'");
      expect(configText).toContain("lang: 'pt-BR'");
      expect(configText).toContain("display: 'standalone'");
      expect(configText).toContain("purpose: 'maskable'");
      expect(configText).toContain('icon-maskable-512x512.png');
      expect(configText).toContain('includeAssets');
    });
  });
});
