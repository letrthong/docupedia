import { Quill } from 'react-quill';
import TableHandler, { rewirteFormats } from 'quill1.3.7-table-module';
import 'quill1.3.7-table-module/dist/index.css';

// Polyfill Parchment 2.x API on Parchment 1.x's Scroll blot for compatibility with table modules
try {
  const Parchment = Quill.import('parchment');
  const Scroll = Quill.import('blots/scroll') || Parchment?.Scroll;
  
  if (Scroll && Parchment) {
    if (!Scroll.prototype.create) {
      Scroll.prototype.create = function(name, value) {
        return Parchment.create(name, value);
      };
    }
    if (!Scroll.prototype.find) {
      Scroll.prototype.find = function(node) {
        return Parchment.find(node);
      };
    }
    if (!Scroll.prototype.query) {
      Scroll.prototype.query = function(name, type) {
        return Parchment.query(name, type);
      };
    }
    console.log('[POLYFILL] Successfully polyfilled Scroll.prototype with Parchment v2 APIs');
  }
} catch (err) {
  console.error('[POLYFILL ERROR] Failed to apply Scroll.prototype polyfills:', err);
}


// Chạy cấu hình định dạng tương thích cho bảng
console.log('[DEBUG] Executing rewirteFormats...');
rewirteFormats();
console.log('[DEBUG] rewirteFormats completed.');

// Đăng ký module Table tương thích 1.3.7
console.log('[DEBUG] Registering TableHandler:', TableHandler);
console.log('[DEBUG] TableHandler properties:', {
  moduleName: TableHandler?.moduleName,
  toolName: TableHandler?.toolName,
  module: TableHandler?.module,
  name: TableHandler?.name
});
Quill.register({ 'modules/table': TableHandler }, true);
console.log('[DEBUG] TableHandler registered under modules/table');

// Log danh sách format đã đăng ký trong Quill
try {
  const registeredImports = Object.keys(Quill.imports);
  const formatsList = registeredImports.filter(k => k.startsWith('formats/')).map(k => k.replace('formats/', ''));
  const tableImports = registeredImports.filter(k => k.toLowerCase().includes('table'));
  
  console.log('[DEBUG] Registered formats list (short names):', formatsList.join(', '));
  console.log('[DEBUG] Table-related imports in Quill:', tableImports.join(', '));
} catch (err) {
  console.error('[DEBUG] Failed to log registered formats:', err);
}

// Vá lỗi tương thích bàn phím giữa Quill 1.3.7 và module TableUp (sử dụng chuỗi thay vì keycode)
const Keyboard = Quill.import('modules/keyboard');

class PatchedKeyboard extends Keyboard {
  constructor(quill, options) {
    super(quill, options);
    
    // Ánh xạ các phím chuỗi của Quill 2.0 sang keycode số của Quill 1.3.7
    const aliasMap = {
      'Tab': 9, 'tab': 9,
      'Enter': 13, 'enter': 13,
      'Escape': 27, 'escape': 27,
      'Backspace': 8, 'backspace': 8,
      'Delete': 46, 'delete': 46
    };
    
    for (const [alias, code] of Object.entries(aliasMap)) {
      if (this.bindings[code]) {
        this.bindings[alias] = this.bindings[code];
      } else {
        this.bindings[code] = [];
        this.bindings[alias] = this.bindings[code];
      }
    }
  }
}

Quill.register({ 'modules/keyboard': PatchedKeyboard }, true);

// Mở rộng Image mặc định của Quill để lưu lại các thuộc tính kích thước, canh lề
const BaseImage = Quill.import('formats/image');
const IMAGE_ATTRIBUTES = ['alt', 'height', 'width', 'style'];

class CustomImage extends BaseImage {
  static formats(domNode) {
    return IMAGE_ATTRIBUTES.reduce(function(formats, attribute) {
      if (domNode.hasAttribute(attribute)) {
        formats[attribute] = domNode.getAttribute(attribute);
      }
      return formats;
    }, {});
  }

  format(name, value) {
    if (IMAGE_ATTRIBUTES.indexOf(name) > -1) {
      if (value) {
        this.domNode.setAttribute(name, value);
      } else {
        this.domNode.removeAttribute(name);
      }
    } else {
      super.format(name, value);
    }
  }
}

Quill.register(CustomImage, true);
