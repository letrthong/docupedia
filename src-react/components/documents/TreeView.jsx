import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Folder, 
  FolderOpen,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Search,
  X
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Modal, Input } from '../common';

// Hàm hỗ trợ sắp xếp: Ưu tiên Folder xếp trước File, sau đó xếp theo thứ tự ABC
const sortNodes = (a, b) => {
  if (a.type === 'folder' && b.type !== 'folder') return -1;
  if (a.type !== 'folder' && b.type === 'folder') return 1;
  return (a.title || '').localeCompare(b.title || '');
};

function TreeNode({ 
  node, 
  level = 0, 
  onSelectDocument, 
  selectedId,
  nodes,
  onCreateDocument,
  onCreateFolder,
  onDelete,
  onRename,
  onMove,
  canCreate,
  canEdit,
  canDelete,
  searchTerm
}) {
  const [expanded, setExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (searchTerm) {
      setExpanded(true);
    }
  }, [searchTerm]);
  
  const isFolder = node.type === 'folder';
  const isSelected = node.id === selectedId;
  const children = node.children?.map(id => nodes[id]).filter(Boolean).sort(sortNodes) || [];

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    } else {
      onSelectDocument(node.id);
    }
  };

  const checkMatch = (n, term) => {
    if (!term) return true;
    if (n.title.toLowerCase().includes(term.toLowerCase())) return true;
    if (n.children) {
      return n.children.some(childId => {
        const childNode = nodes[childId];
        return childNode && checkMatch(childNode, term);
      });
    }
    return false;
  };

  const filteredChildren = children.filter(child => checkMatch(child, searchTerm));

  return (
    <div>
      <div
        className={`group flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer text-sm transition-all ${
          isSelected
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand icon for folders */}
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}
        {!isFolder && <span className="w-4" />}

        {/* Icon - larger and more visible */}
        {isFolder ? (
          expanded ? (
            <FolderOpen className="w-5 h-5 text-amber-500 flex-shrink-0" />
          ) : (
            <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
          )
        ) : (
          <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        )}

        {/* Title */}
        <span className="flex-1 truncate">{node.title}</span>

        {/* Actions */}
        {(canCreate || canEdit || canDelete) && (
        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
          
          {showMenu && (
            <div 
              className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {isFolder && canCreate && (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onCreateDocument(node.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Tài liệu mới
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onCreateFolder(node.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <Folder className="w-4 h-4 text-amber-500" />
                    Thư mục mới
                  </button>
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                </>
              )}
              {canEdit && (
          <>
            <button
              onClick={() => {
                setShowMenu(false);
                onRename(node);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Edit2 className="w-4 h-4 text-slate-400" />
              Đổi tên
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onMove(node);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Folder className="w-4 h-4 text-slate-400" />
              Di chuyển
            </button>
          </>
              )}
              {canDelete && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(node);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
              >
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Children */}
      {isFolder && expanded && filteredChildren.length > 0 && (
        <div>
          {filteredChildren.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelectDocument={onSelectDocument}
              selectedId={selectedId}
              nodes={nodes}
              onCreateDocument={onCreateDocument}
              onCreateFolder={onCreateFolder}
              onDelete={onDelete}
              onRename={onRename}
              onMove={onMove}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tree, currentProject, currentDocument, loadDocument, createDocument, createFolder, deleteDocument, deleteFolder, updateDocument, updateFolder, moveDocument, hasPermission } = useProject();
  const { success, error } = useToast();
  
  const [newDocModal, setNewDocModal] = useState({ open: false, parentId: 'root' });
  const [newFolderModal, setNewFolderModal] = useState({ open: false, parentId: 'root' });
  const [deleteModal, setDeleteModal] = useState({ open: false, node: null });
  const [renameModal, setRenameModal] = useState({ open: false, node: null });
  const [moveModal, setMoveModal] = useState({ open: false, node: null });
  const [newTitle, setNewTitle] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('root');
  const [searchTerm, setSearchTerm] = useState('');

  const canCreate = hasPermission('create');
  const canDelete = hasPermission('delete');
  const canEdit = hasPermission('edit');

  const handleSelectDocument = (docId) => {
    loadDocument(docId);
    if (currentProject) {
      setSearchParams({ projectId: currentProject.id, docId: docId }, { replace: true });
    }
  };

  const handleCreateDocument = async () => {
    if (!newTitle.trim()) return;
    
    const result = await createDocument({
      title: newTitle.trim(),
      parent_id: newDocModal.parentId
    });
    
    if (result.success) {
      success('Tạo tài liệu thành công');
      setNewDocModal({ open: false, parentId: 'root' });
      setNewTitle('');
      // Auto-select new document
      if (result.data?.id) {
        loadDocument(result.data.id);
        if (currentProject) {
          setSearchParams({ projectId: currentProject.id, docId: result.data.id }, { replace: true });
        }
      }
    } else {
      error(result.error || 'Không thể tạo tài liệu');
    }
  };

  const handleCreateFolder = async () => {
    if (!newTitle.trim()) return;
    
    const result = await createFolder({
      title: newTitle.trim(),
      parent_id: newFolderModal.parentId
    });
    
    if (result.success) {
      success('Tạo thư mục thành công');
      setNewFolderModal({ open: false, parentId: 'root' });
      setNewTitle('');
    } else {
      error(result.error || 'Không thể tạo thư mục');
    }
  };

  const handleDelete = async () => {
    const node = deleteModal.node;
    if (!node) return;
    
    const result = node.type === 'folder' 
      ? await deleteFolder(node.id)
      : await deleteDocument(node.id);
    
    if (result.success) {
      success(`Đã xóa ${node.type === 'folder' ? 'thư mục' : 'tài liệu'}`);
      setDeleteModal({ open: false, node: null });
      
      // Xóa docId khỏi URL nếu tài liệu đang mở vừa bị xóa
      if (node.type !== 'folder' && currentDocument?.id === node.id && currentProject) {
        setSearchParams({ projectId: currentProject.id }, { replace: true });
      }
    } else {
      error(result.error || 'Không thể xóa');
    }
  };

  const handleRename = async () => {
    if (!newTitle.trim() || !renameModal.node) return;
    const node = renameModal.node;
    
    const result = node.type === 'folder'
      ? await updateFolder(node.id, { title: newTitle.trim() })
      : await updateDocument(node.id, { title: newTitle.trim() });
      
    if (result.success) {
      success('Đổi tên thành công');
      setRenameModal({ open: false, node: null });
      setNewTitle('');
    } else {
      error(result.error || 'Không thể đổi tên');
    }
  };

  const handleMove = async () => {
    if (!moveModal.node) return;
    const node = moveModal.node;
    
    const result = node.type === 'folder'
      ? await updateFolder(node.id, { parent_id: targetFolderId })
      : await moveDocument(node.id, targetFolderId);
      
    if (result.success) {
      success('Di chuyển thành công');
      setMoveModal({ open: false, node: null });
    } else {
      error(result.error || 'Không thể di chuyển');
    }
  };

  const getFolderOptions = () => {
    const options = [{ id: 'root', title: 'Thư mục gốc' }];
    if (!tree?.nodes) return options;

    const getDescendantIds = (nodeId) => {
      const node = tree.nodes[nodeId];
      if (!node || !node.children) return [];
      return node.children.reduce((acc, childId) => [...acc, childId, ...getDescendantIds(childId)], []);
    };

    const invalidTargetIds = moveModal.node?.type === 'folder' 
      ? [moveModal.node.id, ...getDescendantIds(moveModal.node.id)]
      : [];
    
    Object.values(tree.nodes).forEach(n => {
      if (n.type === 'folder' && !invalidTargetIds.includes(n.id)) {
        options.push({ id: n.id, title: n.title });
      }
    });
    return options;
  };

  if (!tree) {
    return (
      <div className="flex items-center justify-center text-slate-400 py-4 gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-200 border-t-emerald-600" />
        <span className="text-sm">Đang tải...</span>
      </div>
    );
  }

  const rootChildren = tree.root?.children?.map(id => tree.nodes?.[id]).filter(Boolean).sort(sortNodes) || [];
  
  const checkMatch = (n, term) => {
    if (!term) return true;
    if (n.title.toLowerCase().includes(term.toLowerCase())) return true;
    if (n.children) {
      return n.children.some(childId => {
        const childNode = tree.nodes[childId];
        return childNode && checkMatch(childNode, term);
      });
    }
    return false;
  };

  const filteredRootChildren = rootChildren.filter(node => checkMatch(node, searchTerm));

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-3 relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm tài liệu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-8 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Root level actions */}
      {canCreate && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              setNewTitle('');
              setNewDocModal({ open: true, parentId: 'root' });
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Tài liệu
          </button>
          <button
            onClick={() => {
              setNewTitle('');
              setNewFolderModal({ open: true, parentId: 'root' });
            }}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-950/50 transition"
          >
            <Folder className="w-3.5 h-3.5" />
            Thư mục
          </button>
        </div>
      )}

      {/* Tree */}
      {rootChildren.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Chưa có tài liệu</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tạo tài liệu đầu tiên</p>
        </div>
      ) : filteredRootChildren.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Không tìm thấy kết quả cho "{searchTerm}"</p>
        </div>
      ) : (
        filteredRootChildren.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            onSelectDocument={handleSelectDocument}
            selectedId={currentDocument?.id}
            nodes={tree.nodes || {}}
            onCreateDocument={(parentId) => {
              if (canCreate) {
                setNewTitle('');
                setNewDocModal({ open: true, parentId });
              }
            }}
            onCreateFolder={(parentId) => {
              if (canCreate) {
                setNewTitle('');
                setNewFolderModal({ open: true, parentId });
              }
            }}
            onDelete={(node) => {
              if (canDelete) {
                setDeleteModal({ open: true, node });
              }
            }}
            onRename={(node) => {
              if (canEdit) {
                setNewTitle(node.title);
                setRenameModal({ open: true, node });
              }
            }}
        onMove={(node) => {
          if (canEdit) {
            setTargetFolderId(node.parent || 'root');
            setMoveModal({ open: true, node });
          }
        }}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            searchTerm={searchTerm}
          />
        ))
      )}

      {/* New Document Modal */}
      <Modal
        isOpen={newDocModal.open}
        onClose={() => setNewDocModal({ open: false, parentId: 'root' })}
        title="Tạo tài liệu mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewDocModal({ open: false, parentId: 'root' })}>
              Hủy
            </Button>
            <Button onClick={handleCreateDocument}>
              Tạo
            </Button>
          </>
        }
      >
        <Input
          label="Tên tài liệu"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nhập tên tài liệu..."
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
        />
      </Modal>

      {/* New Folder Modal */}
      <Modal
        isOpen={newFolderModal.open}
        onClose={() => setNewFolderModal({ open: false, parentId: 'root' })}
        title="Tạo thư mục mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewFolderModal({ open: false, parentId: 'root' })}>
              Hủy
            </Button>
            <Button onClick={handleCreateFolder}>
              Tạo
            </Button>
          </>
        }
      >
        <Input
          label="Tên thư mục"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Nhập tên thư mục..."
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, node: null })}
        title="Xác nhận xóa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal({ open: false, node: null })}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-300">
          Bạn có chắc muốn xóa "{deleteModal.node?.title}"?
          {deleteModal.node?.type === 'folder' && (
            <span className="block mt-2 text-sm text-rose-600 dark:text-rose-400">
              Tất cả tài liệu trong thư mục cũng sẽ bị xóa!
            </span>
          )}
        </p>
      </Modal>

  {/* Rename Modal */}
  <Modal
    isOpen={renameModal.open}
    onClose={() => setRenameModal({ open: false, node: null })}
    title="Đổi tên"
    footer={
      <>
        <Button variant="secondary" onClick={() => setRenameModal({ open: false, node: null })}>
          Hủy
        </Button>
        <Button onClick={handleRename}>
          Lưu
        </Button>
      </>
    }
  >
    <Input
      label="Tên mới"
      value={newTitle}
      onChange={(e) => setNewTitle(e.target.value)}
      placeholder="Nhập tên mới..."
      autoFocus
      onKeyDown={(e) => e.key === 'Enter' && handleRename()}
    />
  </Modal>

  {/* Move Modal */}
  <Modal
    isOpen={moveModal.open}
    onClose={() => setMoveModal({ open: false, node: null })}
    title="Di chuyển"
    footer={
      <>
        <Button variant="secondary" onClick={() => setMoveModal({ open: false, node: null })}>
          Hủy
        </Button>
        <Button onClick={handleMove}>
          Di chuyển
        </Button>
      </>
    }
  >
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chọn thư mục đích</label>
      <select
        value={targetFolderId}
        onChange={(e) => setTargetFolderId(e.target.value)}
        className="w-full p-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {getFolderOptions().map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.title}
          </option>
        ))}
      </select>
    </div>
  </Modal>
    </div>
  );
}

export default TreeView;
