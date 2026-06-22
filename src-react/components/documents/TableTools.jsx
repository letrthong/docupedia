import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Table } from 'lucide-react';

function TableTools({ onTableOp }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30">
      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mr-2 flex items-center gap-1.5">
        <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        Công cụ Bảng:
      </span>
      
      {/* Thêm Dòng */}
      <button
        onClick={() => onTableOp('insert-row-above')}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <ArrowUp className="w-3 h-3 text-slate-400" />
        <span>Thêm dòng trên</span>
      </button>
      
      <button
        onClick={() => onTableOp('insert-row-below')}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <ArrowDown className="w-3 h-3 text-slate-400" />
        <span>Thêm dòng dưới</span>
      </button>

      <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Thêm Cột */}
      <button
        onClick={() => onTableOp('insert-column-left')}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <ArrowLeft className="w-3 h-3 text-slate-400" />
        <span>Thêm cột trái</span>
      </button>
      
      <button
        onClick={() => onTableOp('insert-column-right')}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <ArrowRight className="w-3 h-3 text-slate-400" />
        <span>Thêm cột phải</span>
      </button>

      <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

      {/* Xóa Dòng/Cột */}
      <button
        onClick={() => onTableOp('delete-row')}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition"
      >
        <Trash2 className="w-3 h-3" />
        <span>Xóa dòng</span>
      </button>
      
      <button
        onClick={() => onTableOp('delete-column')}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition"
      >
        <Trash2 className="w-3 h-3" />
        <span>Xóa cột</span>
      </button>

      {/* Xóa Bảng */}
      <button
        onClick={() => onTableOp('delete-table')}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 text-white rounded shadow-sm hover:bg-red-700 transition ml-auto font-semibold"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Xóa Bảng</span>
      </button>
    </div>
  );
}

export default TableTools;
