import { useState, useEffect, useCallback, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Save, FileText, Download, Clock, Eye, Edit, X, Share2, Globe, Lock, Upload } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common';
import { documentsApi } from '../../api';

// Fix lỗi tương thích thư viện trong môi trường Vite/React
window.Quill = Quill;

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

// Quill toolbar configuration
const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    ['blockquote', 'code-block'],
    ['clean'],
  ],
  imageResize: {
    parchment: Quill.import('parchment'),
    modules: ['Resize', 'DisplaySize', 'Toolbar']
  }
};

const formats = [
  'header', 'font',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'indent',
  'align',
  'link', 'image', 'video',
  'blockquote', 'code-block',
  'width', 'height', 'style', 'alt'
];

function Editor() {
  const { currentProject, currentDocument, saveDocument, hasPermission, setCurrentDocument } = useProject();
  const { success, error } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isViewMode, setIsViewMode] = useState(true); // Default to view mode
  const [isQuillLoaded, setIsQuillLoaded] = useState(false);
  
  const quillRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const canEdit = isAuthenticated && hasPermission('edit');
  const isAutoSaveEnabled = localStorage.getItem('enableAutoSave') === 'true';
  const autoSaveInterval = parseInt(localStorage.getItem('autoSaveInterval')) || 3;

  // Tải module ImageResize động để tránh lỗi circular dependency của Vite
  useEffect(() => {
    import('quill-image-resize-module-react').then(module => {
      Quill.register('modules/imageResize', module.default);
      setIsQuillLoaded(true);
    }).catch(err => {
      console.warn("Could not load Quill modules", err);
      setIsQuillLoaded(true);
    });
  }, []);

  // Load document content - default to view mode
  useEffect(() => {
    if (currentDocument && isQuillLoaded) {
      setTitle(currentDocument.title || '');
      setIsViewMode(true); // Always start in view mode
      setHasChanges(false);
      setLastSaved(currentDocument.updated_at);
      
      // Convert Quill delta to string or use as is
      const docContent = currentDocument.content;
      if (typeof docContent === 'object' && docContent.ops) {
        // It's a delta - need to convert to HTML for view mode
        setContent(docContent);
        // We'll set HTML content after Quill converts it
        setTimeout(() => {
          if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            editor.setContents(docContent);
            setHtmlContent(editor.root.innerHTML);
          }
        }, 300);
      } else if (typeof docContent === 'string') {
        setContent(docContent);
        setHtmlContent(docContent);
      } else {
        setContent('');
        setHtmlContent('');
      }
    } else {
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
      handleSave(true);
    }, autoSaveInterval * 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasChanges, content, title, isViewMode, autoSaveInterval]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && canEdit) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, canEdit]);

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
      setContent(value);
      setHasChanges(true);
    }
  }, []);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleSave = async (isAutoSave = false) => {
    if (!currentDocument || !canEdit || isSaving) return;

    setIsSaving(true);

    try {
      // Get content as Quill delta
      let contentDelta = { ops: [] };
      if (quillRef.current) {
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

      // Gán trực tiếp vào state để ReactQuill tự động hiển thị ra UI
      setContent(htmlToPaste);
      setHasChanges(true);
      success('Đã nhập nội dung từ file');
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
        setTimeout(() => {
          if (quillRef.current) {
            const editor = quillRef.current.getEditor();
            editor.setContents(docContent);
            setHtmlContent(editor.root.innerHTML);
          }
        }, 300);
      }
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

        {/* Hidden Quill for content conversion */}
        <div style={{ position: 'absolute', left: '-9999px', visibility: 'hidden' }}>
          {isQuillLoaded && (
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              modules={{ toolbar: false }}
              readOnly
            />
          )}
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
            formats={formats}
            readOnly={!canEdit}
            className="h-full docupedia-editor"
            placeholder="Bắt đầu viết..."
          />
        )}
      </div>

      {/* Custom styles for Quill */}
      <style>{`
        .docupedia-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .docupedia-editor .ql-container {
          flex: 1;
          overflow: auto;
          font-size: 16px;
        }
        .docupedia-editor .ql-editor {
          min-height: 100%;
          padding: 24px;
        }
        .docupedia-editor .ql-toolbar {
          border-color: #e2e8f0;
          background: #f8fafc;
        }
        .dark .docupedia-editor .ql-toolbar {
          border-color: #1e293b;
          background: #0f172a;
        }
        .dark .docupedia-editor .ql-container {
          border-color: #1e293b;
          background: #0f172a;
          color: #f1f5f9;
        }
        .dark .docupedia-editor .ql-editor.ql-blank::before {
          color: #64748b;
        }
        .dark .docupedia-editor .ql-stroke {
          stroke: #cbd5e1;
        }
        .dark .docupedia-editor .ql-fill {
          fill: #cbd5e1;
        }
        .dark .docupedia-editor .ql-picker-label {
          color: #cbd5e1;
        }
        .dark .docupedia-editor .ql-picker-options {
          background: #1e293b;
          border-color: #334155;
        }
        .dark .docupedia-editor .ql-picker-item {
          color: #e2e8f0;
        }
        .dark .docupedia-editor .ql-picker-item:hover {
          color: #f8fafc;
          background: #334155;
        }
      `}</style>
    </div>
  );
}

export default Editor;
