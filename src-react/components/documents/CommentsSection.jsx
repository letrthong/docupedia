import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Trash2, Send, Check, Edit, CornerDownRight } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common';
import { documentsApi } from '../../api';

const renderCommentTextWithLinks = (text) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-600 dark:text-indigo-400 hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

function CommentsSection() {
  const { currentProject, currentDocument } = useProject();
  const { isAuthenticated, user } = useAuth();
  const { success, error } = useToast();

  const [comments, setComments] = useState([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState('');

  // Reply states
  const [replyingToId, setReplyingToId] = useState(null);
  const [newReply, setNewReply] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!currentProject || !currentDocument) {
      setComments([]);
      return;
    }
    const isPublicCommentsAllowed = currentProject?.is_public && currentProject?.allow_public_comments;
    if (!isAuthenticated && !isPublicCommentsAllowed) {
      setComments([]);
      return;
    }
    setIsCommentsLoading(true);
    try {
      const res = await documentsApi.getComments(currentProject.id, currentDocument.id);
      if (res.success) {
        setComments(res.data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải bình luận:', err);
    }
    setIsCommentsLoading(false);
  }, [currentProject, currentDocument, isAuthenticated]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentProject || !currentDocument) return;
    setIsSubmittingComment(true);
    try {
      const res = await documentsApi.addComment(currentProject.id, currentDocument.id, newComment);
      if (res.success) {
        setNewComment('');
        success('Đã thêm bình luận');
        fetchComments();
      } else {
        error(res.error?.message || 'Không thể thêm bình luận');
      }
    } catch (err) {
      error('Có lỗi xảy ra khi thêm bình luận');
    }
    setIsSubmittingComment(false);
  };

  const handleAddReply = async (e, parentId) => {
    e.preventDefault();
    if (!newReply.trim() || !currentProject || !currentDocument) return;
    setIsSubmittingReply(true);
    try {
      const res = await documentsApi.addComment(currentProject.id, currentDocument.id, newReply, parentId);
      if (res.success) {
        setNewReply('');
        setReplyingToId(null);
        success('Đã gửi phản hồi');
        fetchComments();
      } else {
        error(res.error?.message || 'Không thể gửi phản hồi');
      }
    } catch (err) {
      error('Có lỗi xảy ra khi gửi phản hồi');
    }
    setIsSubmittingReply(false);
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingContent.trim() || !currentProject || !currentDocument) return;
    try {
      const res = await documentsApi.updateComment(
        currentProject.id, currentDocument.id, commentId, editingContent
      );
      if (res.success) {
        setEditingCommentId(null);
        setEditingContent('');
        success('Đã cập nhật bình luận');
        fetchComments();
      } else {
        error(res.error?.message || 'Không thể cập nhật bình luận');
      }
    } catch (err) {
      error('Có lỗi xảy ra khi cập nhật bình luận');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;
    try {
      const res = await documentsApi.deleteComment(currentProject.id, currentDocument.id, commentId);
      if (res.success) {
        success('Đã xóa bình luận');
        fetchComments();
      } else {
        error(res.error?.message || 'Không thể xóa bình luận');
      }
    } catch (err) {
      error('Có lỗi xảy ra khi xóa bình luận');
    }
  };

  if (!currentDocument) return null;

  const isPublicCommentsAllowed = currentProject?.is_public && currentProject?.allow_public_comments;
  if (!isAuthenticated && !isPublicCommentsAllowed) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
          Vui lòng đăng nhập để xem và gửi bình luận.
        </p>
      </div>
    );
  }

  // Calculate total comments including nested replies recursively
  const countComments = (list) => {
    if (!list) return 0;
    return list.reduce((acc, c) => acc + 1 + countComments(c.replies), 0);
  };
  const totalComments = countComments(comments);

  // Helper render recursive comments
  const renderCommentNode = (comment, depth = 0) => {
    const isOwner = user?.id === comment.user_id;
    const hasManagePermission = currentProject?.user_permissions?.includes('manage') || currentProject?.user_permissions?.includes('edit') || user?.role === 'admin';
    const canEditOrDelete = isOwner || hasManagePermission;
    const isEditing = editingCommentId === comment.id;
    const isReplying = replyingToId === comment.id;
    const hasReplies = comment.replies && comment.replies.length > 0;

    // Indent recursive replies using left border and padding
    const indentClass = depth > 0 ? "pl-4 border-l-2 border-slate-100 dark:border-slate-800" : "";
    const avatarSize = depth === 0 ? "w-8 h-8 text-sm" : "w-6 h-6 text-[10px]";

    return (
      <div key={comment.id} className={`flex flex-col gap-3 ${indentClass} mt-4 first:mt-0`}>
        <div className="flex gap-3 items-start">
          {depth > 0 && (
            <CornerDownRight className="w-4 h-4 text-slate-300 dark:text-slate-700 mt-1 shrink-0" />
          )}
          <div className={`${avatarSize} rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-650 dark:text-slate-400 font-bold uppercase shrink-0`}>
            {comment.username?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className={`${depth === 0 ? "text-sm" : "text-xs"} font-semibold text-slate-900 dark:text-white`}>
                  {comment.display_name || comment.username}
                </span>
                <span className="text-[10px] text-slate-450 dark:text-slate-500">
                  {new Date(comment.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              
              {/* Action buttons (Edit/Delete) */}
              {canEditOrDelete && !isEditing && !hasReplies && (
                <div className="flex items-center gap-1.5">
                  {isOwner && (
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditingContent(comment.content);
                      }}
                      className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-850"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-[10px] text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-850"
                    title="Xóa bình luận"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Comment content / edit form */}
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows="2"
                  className="w-full px-3 py-1.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex justify-end gap-2 mt-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditingContent('');
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUpdateComment(comment.id)}
                    disabled={!editingContent.trim()}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Lưu
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className={`mt-1 ${depth === 0 ? "text-sm text-slate-700 dark:text-slate-350" : "text-xs text-slate-650 dark:text-slate-350"} whitespace-pre-line leading-relaxed`}>
                  {renderCommentTextWithLinks(comment.content)}
                </p>
                
                {/* Reply button */}
                {isAuthenticated && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <button
                      onClick={() => {
                        setReplyingToId(replyingToId === comment.id ? null : comment.id);
                        setNewReply('');
                      }}
                      className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-medium"
                      title="Phản hồi"
                    >
                      Phản hồi
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Reply Input Form */}
            {isReplying && (
              <form onSubmit={(e) => handleAddReply(e, comment.id)} className="mt-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-150 dark:border-slate-800">
                <div className="flex gap-2">
                  <textarea
                    value={newReply}
                    onChange={(e) => setNewReply(e.target.value)}
                    placeholder="Viết phản hồi của bạn..."
                    rows="2"
                    className="flex-1 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingToId(null);
                      setNewReply('');
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingReply || !newReply.trim()}
                  >
                    Gửi
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Render child replies recursively */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-1">
            {comment.replies.map((reply) => renderCommentNode(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        Bình luận ({totalComments})
      </h3>

      {/* Comment input form or login prompt */}
      {!isAuthenticated ? (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-650 dark:text-slate-400 font-medium">
            Vui lòng đăng nhập để gửi bình luận.
          </p>
        </div>
      ) : (
        <form onSubmit={handleAddComment} className="mb-6">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-650 dark:text-slate-400 font-bold text-sm uppercase">
              {user?.username?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận của bạn..."
                rows="3"
                className="w-full px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingComment || !newComment.trim()}
                  title="Gửi bình luận"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Bình luận
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      {isCommentsLoading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-650 text-sm">
          Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((comment) => renderCommentNode(comment, 0))}
        </div>
      )}
    </div>
  );
}

export default CommentsSection;
