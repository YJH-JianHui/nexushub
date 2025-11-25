
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  noPadding?: boolean;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-[440px]', noPadding = false, zIndex = 100 }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-start pt-[10vh] justify-center p-4" style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Window */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-[12px] shadow-2xl flex flex-col animate-[fadeIn_0.2s_ease-out] overflow-hidden`}>
        {/* macOS Traffic Light Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-[#F5F5F7] shrink-0 z-10 space-x-2 select-none">
          <div className="flex gap-2 group">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF5F57]/80 border border-[#E0443E] shadow-sm flex items-center justify-center transition-all focus:outline-none"
            >
            </button>
            <button className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] shadow-sm cursor-default"></button>
            <button className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] shadow-sm cursor-default"></button>
          </div>
          <div className="flex-1 text-center pr-14">
            <h2 className="text-[13px] font-bold text-gray-600/80">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className={`${noPadding ? 'p-0 flex flex-col h-full' : 'p-6 max-h-[70vh] overflow-y-auto'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
