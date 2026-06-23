import { useState, useEffect, useRef } from 'react';
import { Search, X, Smile, SmilePlus, Sparkles, AlertTriangle, ArrowRightLeft, Square, Leaf, Coffee, Trophy, Compass } from 'lucide-react';

const CATEGORIES = [
  { id: 'smileys', label: 'Biểu cảm', icon: Smile, items: [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'
  ]},
  { id: 'gestures', label: 'Cử chỉ & Người', icon: SmilePlus, items: [
    '👋', '🤚', '🖐️', '✋', '🖖', '🤙', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'
  ]},
  { id: 'tech', label: 'Công nghệ & Công việc', icon: Sparkles, items: [
    '💻', '🖥️', '⌨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📱', '☎️', '📞', '📟', '📠', '🔋', '🪫', '🔌', '💡', ' flashlight:🔦', '🕯️', '🪔', '🧱', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '⚙️', '🔩', '⛓️', '🪝', '🪚', '🧪', '🧫', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🪒', '🧴', '🧹', '🧺', '🧻', '🧼', '🧽', '🪣', '🔑', '🗝️', '🔒', '🔓', '🔏', '🔐', '🔎', '🔍', '🏷️', '📦', '📫', '📬', '📨', '📩', '📧', '✉️', '📝', '✏️', '✒️', '🖊️', '🖋️', '📄', '📃', '🗒️', '📁', '📂', '🗂️', '📅', '📆', '🗑️', '📊', '📈', '📉', '📋', '📌', '📍', '📎', '📏', '📐', '✂️', '🗃️', '🗄️', '🗳️'
  ]},
  { id: 'nature', label: 'Tự nhiên & Động vật', icon: Leaf, items: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐈', '🐓', '🦃', '🕊️', '🐇', '🐿️', '🦔', '🌳', '🌲', '🌴', '🌵', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰'
  ]},
  { id: 'food', label: 'Ẩm thực & Ăn uống', icon: Coffee, items: [
    '🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍢', '🍣', '🍤', '🍥', '🍡', '🥟', '🥡', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🥤', '🧋', '🧉', '🧊'
  ]},
  { id: 'sports', label: 'Hoạt động & Thể thao', icon: Trophy, items: [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏑', '🏹', '🎣', '🥊', '🥋', '🛹', '🛼', '🎿', '🏂', '🏋️', '🤼', '🤸', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🎯', '🎳', '🎮', '🧩'
  ]},
  { id: 'travel', label: 'Du lịch & Địa điểm', icon: Compass, items: [
    '🚗', '🚙', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛵', '🚲', '🛴', '🚨', '🚔', '🚍', '🚘', '✈️', '🛫', '🛬', '🛸', '🚀', '🚁', '🛶', '⛵', '🛥️', '🚢', '⚓', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🏘️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏨', '🏪', '🏫', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', '⛩️', '⛲', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉'
  ]},
  { id: 'symbols', label: 'Ký hiệu & Cảnh báo', icon: AlertTriangle, items: [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '⭐', '🌟', '✨', '⚡', '💥', '🔥', '🌈', '☀️', '☁️', '🌧️', '❄️', '💨', '💧', '💦', '💤', '💯', '💢', '⚠️', '🚫', '❌', '⭕', '✅', '☑️', '✔️', 'ℹ️', '🆗', '🆙', '🆕', '🆘', '🆓', '🌐', '🧭', '🗺️'
  ]},
  { id: 'arrows', label: 'Mũi tên & Hướng', icon: ArrowRightLeft, items: [
    '🔄', '🔁', '🔃', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↩️', '↪️', '⤴️', '⤵️', '🔙', '🔚', '🔛', '🔜', '🔝'
  ]},
  { id: 'shapes', label: 'Hình khối', icon: Square, items: [
    '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫', '⬛', '⬜', '🔸', '🔹', '🔶', '🔷', '🔺', '🔻', '💠', '🔘', '🔲', '🔳'
  ]}
];

// Bản đồ tìm kiếm đơn giản bằng tiếng Việt / tiếng Anh để hỗ trợ gõ tìm kiếm
const SEARCH_MAP = {
  '😀': 'smiley cuoi hihi vui cười',
  '😃': 'smile cuoi vui cười',
  '😄': 'smile cuoi vui cười',
  '😁': 'smile cuoi toe toet cười',
  '😆': 'smile cuoi toe toe cười vui',
  '😅': 'cuoi ra mo hoi cười ngượng ngùng',
  '😂': 'cuoi ra nuoc mat cười chảy nước mắt',
  '🤣': 'cuoi lan lon cười bò',
  '😊': 'cuoi mim cười mỉm',
  '😇': 'thien than angel ngoan ngoãn',
  '😍': 'yeu tim love thích yêu',
  '🥰': 'yeu tim love yêu thương',
  '😘': 'hon kiss kissy hôn',
  '😋': 'ngon miy ngon miệng đói',
  '😎': 'ngau kieu cool ngầu',
  '🥳': 'party sinh nhat vui vẻ tiệc',
  '😏': 'cuoi khay nhếch mép khinh bỉ',
  '😭': 'khoc to cry khóc lóc',
  '😡': 'gian angry tức giận',
  '👍': 'like tot ok đồng ý thích',
  '👎': 'dislike khong thich phản đối',
  '❤️': 'heart tim do love yêu đỏ',
  '⭐': 'star sao vang lấp lánh',
  '⚠️': 'warning canh bao nguy hiểm',
  '✅': 'check tick ok dung đồng ý',
  '❌': 'cross nham sai huỷ',
  '💻': 'computer laptop may tinh máy tính',
  '📝': 'write note ghi chep bút giấy',
  '🔑': 'key khoa chi khoa chìa khóa',
  '🔒': 'lock khoa close đóng',
  '🐶': 'dog cho cun dong vat',
  '🐱': 'cat meo dong vat',
  '🌳': 'tree cay tu nhien',
  '☕': 'coffee ca phe nuoc uong',
  '🍺': 'beer bia ruou nuoc uong',
  '🏆': 'cup cup vang trophy giai thuong chienthang',
  '⚽': 'football da banh da bong the thao',
  '🚗': 'car oto xe hoi du lich',
  '✈️': 'plane may bay bay du lich'
};

export default function IconPicker({ onSelect, onClose, buttonRef }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const pickerRef = useRef(null);

  // Click outside listener to close the picker
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose, buttonRef]);

  // Position logic (fixed alignment below the toolbar button relative to viewport)
  const getPositionStyles = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    
    return {
      position: 'fixed',
      top: `${rect.bottom + 6}px`,
      left: `${Math.min(rect.left, window.innerWidth - 300)}px`,
      zIndex: 1000,
    };
  };

  // Search filter function
  const getFilteredItems = () => {
    if (!searchQuery.trim()) {
      return CATEGORIES.find(c => c.id === activeCategory)?.items || [];
    }
    const query = searchQuery.toLowerCase();
    const results = [];
    
    CATEGORIES.forEach(cat => {
      cat.items.forEach(item => {
        const keywords = SEARCH_MAP[item] || '';
        if (keywords.includes(query) || item.includes(query)) {
          results.push(item);
        }
      });
    });
    return results;
  };

  const filteredItems = getFilteredItems();

  return (
    <div
      ref={pickerRef}
      style={getPositionStyles()}
      className="absolute z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all text-slate-800 dark:text-slate-100"
    >
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chèn Biểu tượng / Icon</span>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-md transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm biểu tượng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (only show when not searching) */}
      {!searchQuery && (
        <div className="flex items-center gap-0.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 px-1.5 py-1 overflow-x-auto scrollbar-none">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.label}
                className={`p-1.5 min-w-[28px] rounded-lg transition-all flex items-center justify-center ${isActive ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Content */}
      <div className="p-3 max-h-48 overflow-y-auto min-h-[120px]">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-slate-400 text-xs gap-1">
            <span>Không tìm thấy biểu tượng</span>
            <span>Thử tìm từ khóa khác</span>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1.5 justify-items-center">
            {filteredItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(item)}
                className="w-7 h-7 text-lg rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
