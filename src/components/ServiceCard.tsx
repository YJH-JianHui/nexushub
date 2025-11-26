
import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { ServiceItem, NetworkMode } from '../types';

interface ServiceCardProps {
  item: ServiceItem;
  mode: NetworkMode;
  isEditing: boolean;
  titleColor: string;
  descColor: string;
  onEdit: (item: ServiceItem) => void;
  onDelete: (id: string) => void;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetId: string, targetCategory: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ 
  item, 
  mode, 
  isEditing, 
  titleColor,
  descColor,
  onEdit, 
  onDelete,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const targetUrl = mode === NetworkMode.INTERNAL ? item.urlInternal : (item.urlExternal || item.urlInternal);
  const isAvailable = !!targetUrl;
  const [imgError, setImgError] = React.useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isEditing) {
      e.preventDefault();
      onEdit(item);
    }
  };

  return (
    <div 
      className={`service-card relative group/card select-none ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={isEditing}
      onDragStart={(e) => isEditing && onDragStart?.(e, item.id)}
      onDragOver={(e) => {
        if (isEditing) {
          e.preventDefault();
          onDragOver?.(e);
        }
      }}
      onDrop={(e) => {
        if (isEditing) {
          e.preventDefault();
          onDrop?.(e, item.id, item.category);
        }
      }}
    >
      {/* Delete Button - Fixed Interaction */}
      {isEditing && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="absolute -top-1.5 -right-1.5 z-20 bg-white/80 backdrop-blur text-red-500 hover:bg-red-500 hover:text-white p-1 rounded-full shadow-sm transition-all border border-red-100 cursor-pointer"
          title="删除"
        >
          <Trash2 size={10} strokeWidth={2.5} />
        </button>
      )}

      {/* Main Card - Compact Glassmorphism Style */}
      <a
        href={isEditing ? '#' : targetUrl}
        target={isEditing ? '_self' : '_blank'}
        rel="noopener noreferrer"
        onClick={handleCardClick}
        className={`
          relative flex items-center gap-3 px-3 py-2 h-[60px] w-full
          rounded-[16px] overflow-hidden
          transition-all duration-200
          ${isEditing 
            ? 'border border-dashed border-white/60 bg-white/20 backdrop-blur-sm shadow-none' 
            : 'bg-white/40 backdrop-blur-xl border border-white/20 shadow-sm hover:scale-[1.01] active:scale-[0.99]'
          }
          ${!isAvailable ? 'opacity-60 grayscale' : ''}
        `}
      >
        {/* Spotlight / Reflection Effect Layer */}
        {!isEditing && (
          <div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(
                400px circle at var(--mouse-x, 0) var(--mouse-y, 0), 
                rgba(255, 255, 255, 0.4), 
                transparent 40%
              )`
            }}
          />
        )}
        
        {/* Subtle Border Highlight Layer */}
        {!isEditing && (
          <div 
            className="absolute inset-0 pointer-events-none rounded-[16px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(
                250px circle at var(--mouse-x, 0) var(--mouse-y, 0), 
                rgba(255, 255, 255, 0.5), 
                transparent 40%
              )`,
              maskImage: 'linear-gradient(black, black), content-box',
              maskComposite: 'exclude',
              WebkitMaskImage: 'linear-gradient(black, black), content-box',
              WebkitMaskComposite: 'xor',
              padding: '1px' // This creates the border thickness for the mask
            }}
          />
        )}

        {/* Icon - Compact Size */}
        <div className="w-[36px] h-[36px] flex-shrink-0 flex items-center justify-center overflow-hidden z-10">
          {item.iconUrl && !imgError ? (
             <img 
               src={item.iconUrl} 
               alt={item.name} 
               className="w-full h-full object-contain drop-shadow-sm"
               onError={() => setImgError(true)}
               draggable={false}
             />
          ) : (
            <span className="text-lg font-bold" style={{ color: descColor }}>{item.name.charAt(0)}</span>
          )}
        </div>

        {/* Text - Compact Fonts */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-[1px] z-10">
          <h3 
            className="text-[13px] font-medium leading-tight truncate tracking-tight transition-colors"
            style={{ color: titleColor }}
          >
            {item.name}
          </h3>
          <p 
            className="text-[11px] leading-tight truncate opacity-80 transition-colors"
            style={{ color: descColor }}
          >
            {item.description || "点击访问"}
          </p>
        </div>

        {/* Edit Indicator */}
        {isEditing && (
          <div className="text-gray-500/50 z-10">
            <GripVertical size={14} />
          </div>
        )}
      </a>
    </div>
  );
};
