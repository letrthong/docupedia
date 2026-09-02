/**
 * Unit Test cho editorUtils.js
 * Kiểm tra danh sách format Quill, hàm chuyển đổi Delta sang HTML an toàn.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { formats, convertDeltaToHtml } from '../components/documents/editorUtils.js';

test('editorUtils.js - Tiện ích Xử lý Văn bản và Định dạng', async (t) => {
  await t.test('1. formats chứa đầy đủ các định dạng văn bản chuẩn', () => {
    assert.ok(Array.isArray(formats), 'formats phải là một mảng');
    assert.ok(formats.includes('header'), 'Phải hỗ trợ header');
    assert.ok(formats.includes('bold'), 'Phải hỗ trợ bold');
    assert.ok(formats.includes('italic'), 'Phải hỗ trợ italic');
    assert.ok(formats.includes('link'), 'Phải hỗ trợ link');
    assert.ok(formats.includes('image'), 'Phải hỗ trợ image');
    assert.ok(formats.includes('video'), 'Phải hỗ trợ video');
    assert.ok(formats.includes('table'), 'Phải hỗ trợ table');
    assert.ok(formats.includes('code-block'), 'Phải hỗ trợ code-block');
  });

  await t.test('2. convertDeltaToHtml xử lý chuỗi rỗng và chuỗi thuần đúng', () => {
    assert.equal(convertDeltaToHtml(null), '');
    assert.equal(convertDeltaToHtml(''), '');
    assert.equal(convertDeltaToHtml('<p>Xin chào</p>'), '<p>Xin chào</p>');
  });

  await t.test('3. convertDeltaToHtml xử lý object không hợp lệ không bị ném exception', () => {
    assert.equal(convertDeltaToHtml({}), '');
    assert.equal(convertDeltaToHtml({ invalid: true }), '');
  });
});
