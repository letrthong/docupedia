import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Save, FileText, Download, Clock, Eye, Edit, X, Share2, Globe, Lock, Upload } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common';
import { documentsApi } from '../../api';

// Imports sau khi refactor
import './Editor.css';
import './CustomQuillImage';
import { readFileAsDataURL, compressImageToWebP, formats } from './editorUtils';
import TableTools from './TableTools';

// Fix lỗi tương thích thư viện trong môi trường Vite/React
window.Quill = Quill;

// Cờ kiểm tra tránh đăng ký module nhiều lần (đặc biệt trong React Strict Mode)
let isImageResizeRegistered = false;

function Editor() {
  const { currentProject, currentDocument, saveDocument, hasPermission, setCurrentDocument } = useProject();
  const { success, error } = useToast();
  const { isAuthenticated } = useAuth();

  const canEdit = isAuthenticated && hasPermission('edit');
  const isAutoSaveEnabled = localStorage.getItem('enableAutoSave') === 'true';
  const autoSaveInterval = parseInt(localStorage.getItem('autoSaveInterval')) || 3;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isViewMode, setIsViewMode] = useState(true); // Default to view mode
  const [isQuillLoaded, setIsQuillLoaded] = useState(isImageResizeRegistered);
  const [isInTable, setIsInTable] = useState(false);
  
  const currentDocIdRef = useRef(null);
  const quillRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const handleSaveRef = useRef(null);

  // Custom handler khi click nút chọn ảnh trên toolbar
  const handleImageUploadClick = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        let imageDataUrl;
        if (file.type === 'image/gif') {
          imageDataUrl = await readFileAsDataURL(file);
        } else {
          imageDataUrl = await compressImageToWebP(file, 1600, 0.7);
        }

        const editor = quillRef.current.getEditor();
        const range = editor.getSelection();
        const index = range ? range.index : editor.getLength();
        editor.insertEmbed(index, 'image', imageDataUrl);
        editor.setSelection(index + 1);
        setContent(editor.getContents());
        setHasChanges(true);
      } catch (err) {
        console.error('Image upload failed:', err);
        error('Không thể xử lý ảnh');
      }
    };
  }, [error]);

  // Custom handler khi click nút chọn video trên toolbar
  const handleVideoUploadClick = useCallback(() => {
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection();
    const index = range ? range.index : editor.getLength();

    const rawUrl = window.prompt("Nhập URL Video (ví dụ: link YouTube Embed hoặc link trực tiếp video):");
    if (!rawUrl) return;

    // Tự động chuyển đổi link YouTube thường sang link Embed để tránh lỗi X-Frame-Options của YouTube
    let url = rawUrl.trim();
    if (url.includes('youtube.com/watch')) {
      try {
        const queryStr = url.split('?')[1];
        if (queryStr) {
          const urlParams = new URLSearchParams(queryStr);
          const videoId = urlParams.get('v');
          if (videoId) {
            url = `https://www.youtube.com/embed/${videoId}`;
          }
        }
      } catch (e) {
        console.error('Failed to parse YouTube URL:', e);
      }
    } else if (url.includes('youtu.be/')) {
      try {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) {
          url = `https://www.youtube.com/embed/${videoId}`;
        }
      } catch (e) {
        console.error('Failed to parse youtu.be URL:', e);
      }
    }

    const width = window.prompt("Nhập chiều rộng video (ví dụ: 100% hoặc 640px):", "100%");
    if (!width) return;

    const height = window.prompt("Nhập chiều cao video (ví dụ: 450px hoặc 360px):", "450px");
    if (!height) return;

    try {
      editor.insertEmbed(index, 'video', url);
      
      // Áp dụng định dạng kích thước (width, height, style) cho video vừa chèn
      setTimeout(() => {
        editor.formatText(index, 1, 'width', width);
        editor.formatText(index, 1, 'height', height);
        editor.formatText(index, 1, 'style', `max-width: 100%; width: ${width}; height: ${height}; border-radius: 8px;`);
        setContent(editor.getContents());
        setHasChanges(true);
      }, 50);
    } catch (err) {
      console.error('Video insert failed:', err);
      error('Không thể chèn video');
    }
  }, [error]);

  // Custom handler khi click nút tạo bảng trên toolbar
  const handleInsertTableClick = useCallback(() => {
    const editor = quillRef.current.getEditor();
    
    // Lưu lại selection trước khi mở prompt (vì prompt sẽ làm editor mất focus)
    const range = editor.getSelection();
    console.log('[DEBUG] Saved range before prompt:', range);

    const rowsStr = window.prompt("Nhập số dòng (ví dụ: 3):", "3");
    const colsStr = window.prompt("Nhập số cột (ví dụ: 3):", "3");
    if (!rowsStr || !colsStr) return;

    const rows = parseInt(rowsStr, 10);
    const cols = parseInt(colsStr, 10);
    if (isNaN(rows) || isNaN(cols) || rows <= 0 || cols <= 0) {
      error("Số dòng/cột không hợp lệ");
      return;
    }

    try {
      const table = editor.getModule('table');
      if (table) {
        console.log('[DEBUG] table module instance:', table);
        console.log('[DEBUG] table module methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(table)));
        console.log('[DEBUG] insertTable source code:', table.insertTable.toString());
        
        // Log registered formats at insert time
        try {
          const registeredImports = Object.keys(Quill.imports);
          const formatsList = registeredImports.filter(k => k.startsWith('formats/')).map(k => k.replace('formats/', ''));
          const tableImports = registeredImports.filter(k => k.toLowerCase().includes('table'));
          console.log('[DEBUG] Registered formats list:', formatsList.join(', '));
          console.log('[DEBUG] Table-related imports:', tableImports.join(', '));
        } catch (err) {
          console.error('[DEBUG] Failed to log formats:', err);
        }

        console.log('[DEBUG] Executing insertTable...', rows, cols);
        
        // Khôi phục focus và con trỏ chuột
        editor.focus();
        if (range) {
          editor.setSelection(range.index, range.length);
        } else {
          editor.setSelection(editor.getLength(), 0);
        }
        
        table.insertTable(rows, cols);
        console.log('[DEBUG] insertTable executed successfully.');
        console.log('[DEBUG] Editor HTML after insertTable:', editor.root.innerHTML);
        console.log('[DEBUG] Editor Delta after insertTable:', JSON.stringify(editor.getContents()));
        setContent(editor.getContents());
        setHasChanges(true);
      } else {
        error("Không tìm thấy module bảng");
      }
    } catch (err) {
      console.error('[ERROR] insertTable failed:', err);
      alert("Lỗi khi chèn bảng: " + err.message + "\nStack: " + err.stack);
    }
  }, [error]);

  // Thực thi các thao tác trên bảng (Thêm dòng/cột, Xóa dòng/cột/bảng)
  const handleTableOp = useCallback((op) => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const table = editor.getModule('table');
    if (!table) {
      error("Không tìm thấy module bảng");
      return;
    }

    // Giữ focus editor trước khi thao tác
    editor.focus();

    try {
      switch (op) {
        case 'insert-row-above':
          table.insertRowAbove();
          break;
        case 'insert-row-below':
          table.insertRowBelow();
          break;
        case 'insert-column-left':
          table.insertColumnLeft();
          break;
        case 'insert-column-right':
          table.insertColumnRight();
          break;
        case 'delete-row':
          table.deleteRow();
          break;
        case 'delete-column':
          table.deleteColumn();
          break;
        case 'delete-table':
          if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ bảng này không?")) {
            table.deleteTable();
          }
          break;
        default:
          break;
      }
      setContent(editor.getContents());
      setHasChanges(true);
    } catch (err) {
      console.error('[ERROR] table operation failed:', op, err);
      alert("Lỗi khi thao tác trên bảng: " + err.message + "\nStack: " + err.stack);
    }

    // Cập nhật lại state isInTable sau thao tác
    setTimeout(() => {
      const range = editor.getSelection();
      if (range) {
        const [line] = editor.getLine(range.index);
        const blotName = line && line.statics && line.statics.blotName;
        const inTable = !!(blotName && blotName.toLowerCase().includes('table'));
        setIsInTable(inTable);
      } else {
        setIsInTable(false);
      }
    }, 100);
  }, [error]);

  // Cấu hình modules của Quill (useMemo để tránh re-render liên tục và truyền handler tùy biến)
  const modules = useMemo(() => {
    return {
      table: {
        fullWidth: true,
        dragResize: true,
        // Bản dịch tiếng Việt cho tooltip & toolbar
        texts: {
          insertRowAbove: 'Thêm dòng phía trên',
          insertRowBelow: 'Thêm dòng phía dưới',
          insertColumnLeft: 'Thêm cột bên trái',
          insertColumnRight: 'Thêm cột bên phải',
          deleteRow: 'Xóa dòng',
          deleteColumn: 'Xóa cột',
          deleteTable: 'Xóa bảng',
          mergeCells: 'Gộp các ô',
          splitCell: 'Tách ô'
        },
        // Bản dịch tiếng Việt cho menu chuột phải (context menu)
        operationMenu: {
          items: {
            insertRowAbove: { text: 'Thêm dòng trên' },
            insertRowBelow: { text: 'Thêm dòng dưới' },
            insertColumnLeft: { text: 'Thêm cột trái' },
            insertColumnRight: { text: 'Thêm cột phải' },
            deleteRow: { text: 'Xóa dòng' },
            deleteColumn: { text: 'Xóa cột' },
            deleteTable: { text: 'Xóa bảng' },
            mergeCells: { text: 'Gộp các ô' },
            splitCell: { text: 'Tách ô' }
          }
        }
      }, // Kích hoạt module Table của Quill với đầy đủ tùy chọn và bản dịch tiếng Việt
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'font': [] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['link', 'image', 'video'],
          ['table'], // Thêm nút bảng vào toolbar
          ['blockquote', 'code-block'],
          ['clean'],
        ],
        handlers: {
          image: handleImageUploadClick,
          table: handleInsertTableClick,
          video: handleVideoUploadClick
        }
      },
      imageResize: {
        parchment: Quill.import('parchment'),
        modules: ['Resize', 'DisplaySize', 'Toolbar']
      }
    };
  }, [handleImageUploadClick, handleInsertTableClick, handleVideoUploadClick]);

  // Tự động bắt sự kiện paste/drop hình ảnh trong editor để nén sang WebP
  useEffect(() => {
    if (!isQuillLoaded || !quillRef.current || !canEdit || isViewMode) return;

    const editor = quillRef.current.getEditor();
    const root = editor.root;

    const handlePasteOrDrop = async (e) => {
      let files = [];
      
      if (e.type === 'paste') {
        const items = e.clipboardData?.items || [];
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) files.push(file);
          }
        }
      } else if (e.type === 'drop') {
        const items = e.dataTransfer?.files || [];
        for (const file of items) {
          if (file.type.indexOf('image') !== -1) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault(); // Ngăn chặn chèn file dung lượng gốc mặc định

        const range = editor.getSelection(true);
        let insertIndex = range ? range.index : editor.getLength();

        for (const file of files) {
          try {
            let imageDataUrl;
            if (file.type === 'image/gif') {
              imageDataUrl = await readFileAsDataURL(file);
            } else {
              imageDataUrl = await compressImageToWebP(file, 1600, 0.7);
            }
            
            editor.insertEmbed(insertIndex, 'image', imageDataUrl);
            insertIndex++;
          } catch (err) {
            console.error('Không thể xử lý ảnh pasted/dropped:', err);
          }
        }
        editor.setSelection(insertIndex);
        setContent(editor.getContents());
        setHasChanges(true);
      }
    };

    root.addEventListener('paste', handlePasteOrDrop);
    root.addEventListener('drop', handlePasteOrDrop);

    return () => {
      root.removeEventListener('paste', handlePasteOrDrop);
      root.removeEventListener('drop', handlePasteOrDrop);
    };
  }, [isQuillLoaded, canEdit, isViewMode]);

  // Theo dõi con trỏ chuột trong editor xem có đang ở trong ô bảng hay không
  useEffect(() => {
    if (!isQuillLoaded || !quillRef.current || !canEdit || isViewMode) {
      setIsInTable(false);
      return;
    }

    const editor = quillRef.current.getEditor();
    
    const handleSelectionChange = (range) => {
      if (!range) {
        setIsInTable(false);
        return;
      }
      try {
        const [line] = editor.getLine(range.index);
        const blotName = line && line.statics && line.statics.blotName;
        const inTable = !!(blotName && blotName.toLowerCase().includes('table'));
        setIsInTable(inTable);
      } catch (err) {
        setIsInTable(false);
      }
    };

    editor.on('selection-change', handleSelectionChange);

    const handleTextChange = () => {
      const range = editor.getSelection();
      handleSelectionChange(range);
    };
    editor.on('text-change', handleTextChange);

    return () => {
      editor.off('selection-change', handleSelectionChange);
      editor.off('text-change', handleTextChange);
    };
  }, [isQuillLoaded, canEdit, isViewMode]);

  // Đăng ký lại custom handler cho nút table để bỏ qua picker bị lỗi giao diện của thư viện
  useEffect(() => {
    if (!isQuillLoaded || !quillRef.current || !canEdit || isViewMode) return;

    const editor = quillRef.current.getEditor();
    const toolbar = editor.getModule('toolbar');
    if (toolbar) {
      console.log('[DEBUG] Binding custom table handler to toolbar to override module picker');
      toolbar.addHandler('table', handleInsertTableClick);
    }
  }, [isQuillLoaded, canEdit, isViewMode, handleInsertTableClick]);

  // Tự động dịch các nhãn tiếng Trung sang Tiếng Việt + Tiếng Anh bằng cách theo dõi DOM thay đổi (MutationObserver)
  useEffect(() => {
    if (!isQuillLoaded || isViewMode) return;

    const translationMap = {
      '在上方插入一行': 'Thêm dòng phía trên (Insert Row Above)',
      '在下方插入一行': 'Thêm dòng phía dưới (Insert Row Below)',
      '在左侧插入一列': 'Thêm cột bên trái (Insert Column Left)',
      '在右侧插入一列': 'Thêm cột bên phải (Insert Column Right)',
      '删除所在行': 'Xóa dòng này (Delete Row)',
      '删除所在列': 'Xóa cột này (Delete Column)',
      '删除表格': 'Xóa bảng (Delete Table)',
      '合并单元格': 'Gộp các ô (Merge Cells)',
      '拆分单元格': 'Tách ô (Split Cell)',
      '设置背景颜色': 'Màu nền (Set Background Color)',
      '清除背景颜色': 'Xóa màu nền (Clear Background Color)',
      '设置边框颜色': 'Màu viền (Set Border Color)',
      '清除边框颜色': 'Xóa màu viền (Clear Border Color)',
      '插入上方行': 'Thêm dòng phía trên (Insert Row Above)',
      '插入下方行': 'Thêm dòng phía dưới (Insert Row Below)',
      '插入左侧列': 'Thêm cột bên trái (Insert Column Left)',
      '插入右侧列': 'Thêm cột bên phải (Insert Column Right)',
      '删除当前行': 'Xóa dòng hiện tại (Delete Current Row)',
      '删除当前列': 'Xóa cột hiện tại (Delete Current Column)',
      '插入行': 'Thêm dòng (Insert Row)',
      '插入列': 'Thêm cột (Insert Column)',
      '删除行': 'Xóa dòng (Delete Row)',
      '删除列': 'Xóa cột (Delete Column)',
      '清除': 'Xóa sạch (Clear)',
      '自定义行列数': 'Tạo bảng tùy chỉnh (Custom Table Size)',
      '设置': 'Thiết lập (Settings)',
      '背景颜色': 'Màu nền (Background Color)',
      '边框颜色': 'Màu viền (Border Color)',
      '对齐方式': 'Căn lề (Alignment)',
      '左对齐': 'Căn trái (Align Left)',
      '居中对齐': 'Căn giữa (Align Center)',
      '右对齐': 'Căn phải (Align Right)',
      '默认': 'Mặc định (Default)',
      '红色': 'Đỏ (Red)',
      '蓝色': 'Xanh dương (Blue)',
      '绿色': 'Xanh lá (Green)',
      '黄色': 'Vàng (Yellow)',
      '黑色': 'Đen (Black)',
      '白色': 'Trắng (White)',
      '无': 'Không màu (None)'
    };

    const translateElement = (el) => {
      if (el.nodeType === Node.TEXT_NODE) {
        const text = el.textContent.trim();
        if (translationMap[text]) {
          el.textContent = translationMap[text];
        }
      } else if (el.nodeType === Node.ELEMENT_NODE) {
        // Duyệt đệ quy qua các node con
        for (const child of el.childNodes) {
          translateElement(child);
        }
        // Dịch cả thuộc tính title hoặc placeholder nếu có
        const title = el.getAttribute('title');
        if (title && translationMap[title]) {
          el.setAttribute('title', translationMap[title]);
        }
      }
    };

    // Tạo observer theo dõi thêm mới các element vào body (nơi dropdown context menu được sinh ra)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translateElement(node);
            }
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Dịch các thành phần hiện tại
    translateElement(document.body);

    return () => {
      observer.disconnect();
    };
  }, [isQuillLoaded, isViewMode]);

  // Lắng nghe sự kiện click vào ql-video-overlay trong editor để mở hộp thoại cập nhật kích thước video
  useEffect(() => {
    if (!isQuillLoaded || !quillRef.current || !canEdit || isViewMode) return;

    const editor = quillRef.current.getEditor();
    const root = editor.root;

    const handleOverlayClick = (e) => {
      if (e.target.classList.contains('ql-video-overlay')) {
        e.preventDefault();
        e.stopPropagation();

        const container = e.target.closest('.ql-video-container');
        if (!container) return;

        const iframe = container.querySelector('iframe');
        if (!iframe) return;

        const currentWidth = iframe.getAttribute('width') || '100%';
        const currentHeight = iframe.getAttribute('height') || '450px';

        const newWidth = window.prompt("Nhập chiều rộng mới cho video (ví dụ: 100% hoặc 640px):", currentWidth);
        if (newWidth === null) return; // Nhấn Hủy

        const newHeight = window.prompt("Nhập chiều cao mới cho video (ví dụ: 450px hoặc 360px):", currentHeight);
        if (newHeight === null) return; // Nhấn Hủy

        // Tìm blot của container video để lấy chỉ số (index) và cập nhật
        const blot = Quill.find(container);
        if (blot) {
          const index = editor.getIndex(blot);
          editor.formatText(index, 1, 'width', newWidth);
          editor.formatText(index, 1, 'height', newHeight);
          editor.formatText(index, 1, 'style', `max-width: 100%; width: ${newWidth}; height: ${newHeight}; border-radius: 8px;`);
          
          setContent(editor.getContents());
          setHasChanges(true);
        }
      }
    };

    root.addEventListener('click', handleOverlayClick);
    return () => {
      root.removeEventListener('click', handleOverlayClick);
    };
  }, [isQuillLoaded, canEdit, isViewMode]);

  // Tải module ImageResize động để tránh lỗi circular dependency của Vite
  useEffect(() => {
    if (isImageResizeRegistered) {
      setIsQuillLoaded(true);
      return;
    }
    
    let isMounted = true;
    import('quill-image-resize-module-react').then(module => {
      if (!isImageResizeRegistered) {
        const ImageResize = module.default || module;
        Quill.register('modules/imageResize', ImageResize);
        isImageResizeRegistered = true;
      }
      if (isMounted) setIsQuillLoaded(true);
    }).catch(err => {
      console.warn("Could not load Quill modules", err);
      if (isMounted) setIsQuillLoaded(true);
    });
    return () => { isMounted = false; };
  }, []);

  // Đăng ký matcher cho clipboard để chuẩn hóa video iframe cũ thành video wrapper mới
  useEffect(() => {
    if (!isQuillLoaded || !quillRef.current) return;

    const editor = quillRef.current.getEditor();
    const clipboard = editor.getModule('clipboard');
    if (clipboard && clipboard.addMatcher) {
      clipboard.addMatcher('iframe.ql-video', (node, delta) => {
        const src = node.getAttribute('src');
        const width = node.getAttribute('width') || '100%';
        const height = node.getAttribute('height') || '450px';
        const style = node.getAttribute('style') || `max-width: 100%; width: ${width}; height: ${height}; border-radius: 8px;`;
        
        return {
          ops: [{
            insert: { video: src },
            attributes: {
              width: width,
              height: height,
              style: style
            }
          }]
        };
      });
      console.log('[DEBUG] Registered custom clipboard matcher for iframe.ql-video');
    }
  }, [isQuillLoaded]);

  // Load document content - default to view mode
  useEffect(() => {
    if (currentDocument && isQuillLoaded) {
      const isNewDoc = currentDocIdRef.current !== currentDocument.id;
      
      if (isNewDoc) {
        currentDocIdRef.current = currentDocument.id;
        setTitle(currentDocument.title || '');
        setIsViewMode(true); // Always start in view mode for NEW documents
        setHasChanges(false);
        setLastSaved(currentDocument.updated_at);
        
        // Convert Quill delta to string or use as is
        const docContent = currentDocument.content;
        if (typeof docContent === 'object' && docContent.ops) {
          setContent(docContent);
          try {
            const tempContainer = document.createElement('div');
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);
            const tempQuill = new Quill(tempContainer, { readOnly: true });
            tempQuill.setContents(docContent);
            setHtmlContent(tempContainer.querySelector('.ql-editor').innerHTML);
            document.body.removeChild(tempContainer);
          } catch (err) {
            console.error('Error converting Delta to HTML', err);
          }
        } else if (typeof docContent === 'string') {
          setContent(docContent);
          setHtmlContent(docContent);
        } else {
          setContent('');
          setHtmlContent('');
        }
      } else {
        // If document updated (e.g. after save), just update lastSaved
        setLastSaved(currentDocument.updated_at);
      }
    } else {
      currentDocIdRef.current = null;
      setTitle('');
      setContent('');
      setHtmlContent('');
      setHasChanges(false);
      setLastSaved(null);
      setIsViewMode(true);
    }
  }, [currentDocument, isQuillLoaded]);

  // Auto-save (only in edit mode)
  useEffect(() => {
    if (!isAutoSaveEnabled || !hasChanges || !currentDocument || !canEdit || isViewMode) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      if (handleSaveRef.current) handleSaveRef.current(true);
    }, autoSaveInterval * 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasChanges, content, title, isViewMode, autoSaveInterval, isAutoSaveEnabled, currentDocument, canEdit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (handleSaveRef.current) {
          handleSaveRef.current(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cập nhật thẻ tiêu đề trình duyệt (Browser Tab Title)
  useEffect(() => {
    if (title) {
      document.title = `${title} - ${currentProject?.name || 'Docupedia'}`;
    } else if (currentProject) {
      document.title = `${currentProject.name} - Docupedia`;
    }

    return () => {
      document.title = 'Docupedia';
    };
  }, [title, currentProject]);

  const handleContentChange = useCallback((value, delta, source, editor) => {
    if (source === 'user') {
      setContent(editor.getContents());
      setHasChanges(true);
    }
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleSave = async (isAutoSave = false) => {
    if (!currentDocument || !canEdit || isSaving) return;
    
    if (!isAutoSave && !hasChanges) {
      success('Tài liệu đã được lưu');
      return;
    }

    setIsSaving(true);

    try {
      // Get content as Quill delta
      let contentDelta = currentDocument.content || { ops: [] };
      if (quillRef.current && !isViewMode) {
        const editor = quillRef.current.getEditor();
        contentDelta = editor.getContents();
      }

      const result = await saveDocument(currentDocument.id, {
        title: title.trim() || 'Untitled',
        content: contentDelta,
      });

      if (result.success) {
        setHasChanges(false);
        setLastSaved(new Date().toISOString());
        if (!isAutoSave) {
          success('Đã lưu');
        }
      } else {
        error(result.error || 'Không thể lưu');
      }
    } catch (err) {
      error('Có lỗi xảy ra');
    }

    setIsSaving(false);
  };

  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const handleCopyLink = () => {
    if (!currentProject || !currentDocument) return;
    
    const baseUrl = window.location.origin;
    // Sử dụng cấu trúc route đẹp: /project/:projectId/doc/:documentId
    const shareUrl = `${baseUrl}/docupedia/project/${currentProject.id}/doc/${currentDocument.id}`;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => success('Đã sao chép link chia sẻ'))
      .catch(() => error('Không thể sao chép link'));
  };

  const handleExport = async (format) => {
    if (!currentDocument || !currentProject) return;

    try {
      const response = await documentsApi.export(currentProject.id, currentDocument.id, format);
      if (response.success) {
        // Create download link
        const blob = new Blob([response.data.content], { type: response.data.mime_type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        a.click();
        URL.revokeObjectURL(url);
        success(`Đã xuất ${format.toUpperCase()}`);
      }
    } catch (err) {
      error('Không thể xuất file');
    }
  };

  // Import nội dung từ file HTML/TXT
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target.result;
      
      // Nếu là file HTML, chỉ lấy phần nội dung bên trong thẻ <body> để tránh rác
      let htmlToPaste = fileContent;
      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(fileContent, 'text/html');
        htmlToPaste = doc.body ? doc.body.innerHTML : fileContent;
      }

      // Nhập qua clipboard của editor để chuẩn hóa thành Delta
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.clipboard.dangerouslyPasteHTML(htmlToPaste);
        setContent(editor.getContents());
        setHasChanges(true);
        success('Đã nhập nội dung từ file');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input để có thể chọn lại cùng 1 file
  };

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          Chọn một tài liệu để bắt đầu
        </p>
        <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
          hoặc tạo tài liệu mới từ menu bên trái
        </p>
      </div>
    );
  }

  // Switch to edit mode
  const handleStartEdit = () => {
    if (!canEdit) return;
    setIsViewMode(false);
    
    // Cập nhật state trực tiếp để ReactQuill nhận giá trị ngay khi mount
    if (currentDocument?.content) {
      setContent(currentDocument.content);
    }
    
    // Load content into Quill
    setTimeout(() => {
      if (quillRef.current && currentDocument?.content) {
        const editor = quillRef.current.getEditor();
        if (typeof currentDocument.content === 'object' && currentDocument.content.ops) {
          editor.setContents(currentDocument.content);
        }
      }
    }, 300);
  };

  // Cancel edit and go back to view mode
  const handleCancelEdit = () => {
    if (hasChanges) {
      if (!window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?')) {
        return;
      }
    }
    setIsViewMode(true);
    setHasChanges(false);
    // Reset content
    if (currentDocument?.content) {
      const docContent = currentDocument.content;
      setContent(docContent);
      if (typeof docContent === 'object' && docContent.ops) {
        try {
          const tempContainer = document.createElement('div');
          tempContainer.style.display = 'none';
          document.body.appendChild(tempContainer);
          const tempQuill = new Quill(tempContainer, { readOnly: true });
          tempQuill.setContents(docContent);
          setHtmlContent(tempContainer.querySelector('.ql-editor').innerHTML);
          document.body.removeChild(tempContainer);
        } catch (err) {
          console.error(err);
        }
      } else if (typeof docContent === 'string') {
        setHtmlContent(docContent);
      }
      setTitle(currentDocument.title || '');
    }
  };

  // VIEW MODE
  if (isViewMode) {
    return (
      <div className="flex flex-col h-full">
        {/* View Mode Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg" title={currentProject?.is_public ? 'Dự án công khai' : 'Dự án nội bộ'}>
              {currentProject?.is_public ? (
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {title || 'Tài liệu không có tiêu đề'}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="hidden sm:flex text-xs text-slate-500 dark:text-slate-400 items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">Cập nhật: </span>{lastSaved ? new Date(lastSaved).toLocaleString('vi-VN') : 'Chưa xác định'}
                </span>
                <span className="hidden sm:flex text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>Chế độ xem</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {currentProject?.is_public && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                title="Sao chép link chia sẻ"
              >
                <Share2 className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Chia sẻ</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleExport('html')}
              title="Tải xuống HTML"
            >
              <Download className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Tải xuống</span>
            </Button>

            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartEdit}
                title="Chỉnh sửa tài liệu"
              >
                <Edit className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Chỉnh sửa</span>
              </Button>
            )}
          </div>
        </div>

        {/* View Mode Content */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto p-4 sm:p-8 min-h-full flex flex-col">
            <article 
              className="flex-1 prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-200 dark:border-slate-800"
              dangerouslySetInnerHTML={{ __html: htmlContent || '<p class="text-slate-400">Tài liệu trống</p>' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="flex flex-col h-full">
      {/* Edit Mode Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            disabled={!canEdit}
            className="text-lg sm:text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 dark:text-white flex-1 placeholder:text-slate-400"
            placeholder="Tiêu đề tài liệu..."
          />
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="hidden sm:flex text-xs text-slate-500 dark:text-slate-400 items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" />
              {new Date(lastSaved).toLocaleTimeString('vi-VN')}
            </span>
          )}

          {hasChanges && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-lg">Chưa lưu</span>
          )}

          <span className="hidden sm:inline text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full font-medium">
            Đang chỉnh sửa
          </span>

          {currentProject?.is_public && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              title="Sao chép link chia sẻ"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Tải lên file HTML/TXT"
          >
            <Upload className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Nhập file</span>
          </Button>
          <input 
            type="file" 
            accept=".html,.htm,.txt" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImport} 
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelEdit}
            title="Hủy chỉnh sửa"
          >
            <X className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Hủy</span>
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                await handleSave();
                // Update HTML for view mode
                if (quillRef.current) {
                  setHtmlContent(quillRef.current.getEditor().root.innerHTML);
                }
                setIsViewMode(true);
              }}
              isLoading={isSaving}
              title="Lưu & Đóng"
            >
              <Save className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Lưu & Đóng</span>
            </Button>
          )}
        </div>
      </div>

      {/* Table Actions Toolbar (hiển thị khi đang chọn ô trong bảng) */}
      {isInTable && <TableTools onTableOp={handleTableOp} />}

      {/* Editor */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
        {!isQuillLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleContentChange}
            modules={modules}
            readOnly={!canEdit}
            className="h-full docupedia-editor"
            placeholder="Bắt đầu viết..."
          />
        )}
      </div>
    </div>
  );
}

export default Editor;
