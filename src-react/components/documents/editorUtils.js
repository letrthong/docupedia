// Đọc file thành DataURL (Base64)
export const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Nén ảnh thành WebP sử dụng Canvas với quản lý bộ nhớ tối ưu (Zero-copy ObjectURL + GPU Cleanup)
export const compressImageToWebP = (file, maxWidth = 1600, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/gif') {
      readFileAsDataURL(file).then(resolve).catch(reject);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      // Resize nếu chiều rộng lớn hơn maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        reject(new Error('Không thể khởi tạo Canvas 2D'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert sang webp base64
      const dataUrl = canvas.toDataURL('image/webp', quality);
      
      // Giải phóng bộ nhớ GPU của Canvas
      canvas.width = 0;
      canvas.height = 0;
      
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

// Nén ảnh thành WebP Blob sử dụng Canvas với quản lý bộ nhớ tối ưu
export const compressImageToBlob = (file, maxWidth = 1600, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      // Resize nếu chiều rộng lớn hơn maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        canvas.width = 0;
        canvas.height = 0;
        reject(new Error('Không thể khởi tạo Canvas 2D'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert sang webp blob
      canvas.toBlob(
        (blob) => {
          // Giải phóng bộ nhớ Canvas ngay sau khi xuất blob
          canvas.width = 0;
          canvas.height = 0;

          if (blob) {
            const convertedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
              type: 'image/webp'
            });
            resolve(convertedFile);
          } else {
            resolve(file);
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

// Singleton chuyển đổi Quill Delta sang HTML an toàn, không rò rỉ bộ nhớ
let cachedConverterQuill = null;
let cachedConverterContainer = null;

export const convertDeltaToHtml = (docContent, QuillConstructor = null) => {
  if (!docContent) return '';
  if (typeof docContent === 'string') return docContent;
  if (typeof docContent !== 'object' || !docContent.ops) return '';

  // Hỗ trợ môi trường Node.js / Unit test runner không có DOM
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return '';
  }

  const ActualQuill = QuillConstructor || (typeof window !== 'undefined' ? window.Quill : null);

  try {
    if (!cachedConverterContainer) {
      cachedConverterContainer = document.createElement('div');
      cachedConverterContainer.style.display = 'none';
      document.body.appendChild(cachedConverterContainer);
      if (ActualQuill) {
        cachedConverterQuill = new ActualQuill(cachedConverterContainer, {
          readOnly: true,
          modules: { syntax: true }
        });
      }
    }

    if (cachedConverterQuill) {
      cachedConverterQuill.setContents(docContent);

      // Map data-language attributes to highlight.js classes and run highlighting synchronously
      cachedConverterContainer.querySelectorAll('pre.ql-syntax').forEach((block) => {
        const parentContainer = block.closest('.ql-code-block-container');
        const lang = block.getAttribute('data-language') || (parentContainer ? parentContainer.getAttribute('data-language') : null);
        
        if (lang && lang !== 'plain') {
          block.classList.add(`language-${lang}`);
        }
        
        if (typeof window !== 'undefined' && window.hljs) {
          try {
            if (window.hljs.highlightElement) {
              window.hljs.highlightElement(block);
            } else if (window.hljs.highlightBlock) {
              window.hljs.highlightBlock(block);
            }
          } catch (e) {}
        }
      });

      return cachedConverterContainer.querySelector('.ql-editor')?.innerHTML || '';
    }
  } catch (err) {
    console.error('Error converting Delta to HTML', err);
  }
  return '';
};

// Các định dạng Quill hỗ trợ
export const formats = [
  'header', 'font',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'indent',
  'align',
  'link', 'image', 'video',
  'blockquote', 'code-block',
  'width', 'height', 'style', 'alt',
  'table', 'table-cell', 'table-row', 'table-col', 'table-cell-line', 'table-container'
];
