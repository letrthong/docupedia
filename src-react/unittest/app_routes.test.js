/**
 * Unit Test cho App.jsx và Cấu trúc Điều Hướng (Routing & Providers)
 * Sử dụng bộ kiểm thử Native Node.js test runner (node:test & node:assert)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_REACT_DIR = path.resolve(__dirname, '..');
const APP_JSX_PATH = path.join(SRC_REACT_DIR, 'App.jsx');

test('App.jsx - Cấu trúc Route & Provider Hierarchy', async (t) => {
  const appContent = fs.readFileSync(APP_JSX_PATH, 'utf-8');

  await t.test('1. Tệp App.jsx tồn tại và có thể đọc được', () => {
    assert.ok(fs.existsSync(APP_JSX_PATH), 'App.jsx phải tồn tại trong thư mục src-react/');
    assert.ok(appContent.length > 500, 'Nội dung App.jsx không được rỗng');
  });

  await t.test('2. Tất cả các trang Lazy-loaded Pages đều tồn tại trên đĩa', () => {
    // Regex tìm các import('./pages/X')
    const lazyImportRegex = /import\(\s*['"](\.\/pages\/[^'"]+)['"]\s*\)/g;
    let match;
    const lazyPages = [];

    while ((match = lazyImportRegex.exec(appContent)) !== null) {
      lazyPages.push(match[1]);
    }

    assert.ok(lazyPages.length >= 5, `Phải có ít nhất 5 lazy-loaded pages, tìm thấy: ${lazyPages.length}`);

    for (const pageRelPath of lazyPages) {
      const candidates = [
        path.resolve(SRC_REACT_DIR, `${pageRelPath}.jsx`),
        path.resolve(SRC_REACT_DIR, `${pageRelPath}.js`),
        path.resolve(SRC_REACT_DIR, pageRelPath, 'index.jsx'),
        path.resolve(SRC_REACT_DIR, pageRelPath, 'index.js'),
      ];

      const exists = candidates.some(p => fs.existsSync(p));
      assert.ok(exists, `Trang lazy import không tồn tại trên đĩa: ${pageRelPath}`);
    }
  });

  await t.test('3. Thứ tự lồng nhau của các Context Providers hợp lệ', () => {
    // Provider thứ tự chuẩn: BrowserRouter -> ThemeProvider -> ToastProvider -> AuthProvider -> ProjectProvider -> AppRoutes
    const providers = [
      'BrowserRouter',
      'ThemeProvider',
      'ToastProvider',
      'AuthProvider',
      'ProjectProvider',
      'AppRoutes'
    ];

    let lastIndex = -1;
    for (const provider of providers) {
      const idx = appContent.indexOf(`<${provider}`);
      assert.ok(idx !== -1, `App.jsx phải bọc bởi <${provider}>`);
      assert.ok(idx > lastIndex, `Thứ tự Provider sai: <${provider}> phải nằm bên trong các provider trước đó`);
      lastIndex = idx;
    }
  });

  await t.test('4. Cấu hình Basename và Route Fallback hợp lệ', () => {
    assert.match(appContent, /basename=['"]\/docupedia['"]/, 'BrowserRouter phải có basename="/docupedia"');
    assert.match(appContent, /path=['"]\*['"]/, 'Phải có Route catch-all wildcard (path="*")');
    assert.match(appContent, /<ProtectedRoute adminOnly/, 'Phải có cơ chế bảo vệ Route cho Admin (adminOnly)');
  });
});
