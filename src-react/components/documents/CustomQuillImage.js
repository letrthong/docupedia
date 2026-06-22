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

// Mở rộng Video mặc định của Quill thành BlockEmbed dạng DIV container để chứa iframe + overlay (cho phép click để resize)
const BlockEmbed = Quill.import('blots/block/embed');

// Hàm chuyển đổi link YouTube watch sang link embed để tránh lỗi X-Frame-Options
function ensureEmbedUrl(url) {
  if (!url) return url;
  let cleanUrl = url.trim();
  
  if (cleanUrl.includes('youtube.com/watch')) {
    try {
      const queryStr = cleanUrl.split('?')[1];
      if (queryStr) {
        const urlParams = new URLSearchParams(queryStr);
        const videoId = urlParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
    } catch (e) {
      console.error('Failed to parse YouTube URL in ensureEmbedUrl:', e);
    }
  } else if (cleanUrl.includes('youtu.be/')) {
    try {
      const videoId = cleanUrl.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {
      console.error('Failed to parse youtu.be URL in ensureEmbedUrl:', e);
    }
  }
  
  return cleanUrl;
}

class CustomVideo extends BlockEmbed {
  static create(value) {
    const node = document.createElement('div');
    node.className = 'ql-video-container';
    node.setAttribute('contenteditable', 'false');

    const iframe = document.createElement('iframe');
    const BaseVideo = Quill.import('formats/video');
    let src = BaseVideo && BaseVideo.sanitize ? BaseVideo.sanitize(value) : value;
    src = ensureEmbedUrl(src);
    iframe.setAttribute('src', src);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.className = 'ql-video';

    // Tạo lớp phủ trong suốt trên editor để nhận diện click chỉnh sửa kích thước
    const overlay = document.createElement('div');
    overlay.className = 'ql-video-overlay';

    node.appendChild(iframe);
    node.appendChild(overlay);
    return node;
  }

  static value(node) {
    const iframe = node.querySelector('iframe');
    return iframe ? iframe.getAttribute('src') : '';
  }

  static formats(domNode) {
    const iframe = domNode.querySelector('iframe');
    if (!iframe) return {};
    return ['height', 'width', 'style'].reduce(function(formats, attribute) {
      if (iframe.hasAttribute(attribute)) {
        formats[attribute] = iframe.getAttribute(attribute);
      }
      return formats;
    }, {});
  }

  format(name, value) {
    const iframe = this.domNode.querySelector('iframe');
    if (!iframe) return;

    if (['height', 'width', 'style'].indexOf(name) > -1) {
      if (value) {
        iframe.setAttribute(name, value);
        // Đồng bộ kích thước lên container bên ngoài để hiển thị chuẩn
        this.domNode.setAttribute(name, value);
        if (name === 'style') {
          this.domNode.setAttribute('style', value);
        }
      } else {
        iframe.removeAttribute(name);
        this.domNode.removeAttribute(name);
      }
    } else {
      super.format(name, value);
    }
  }
}

CustomVideo.blotName = 'video';
CustomVideo.tagName = 'DIV';
CustomVideo.className = 'ql-video-container';

Quill.register(CustomVideo, true);
