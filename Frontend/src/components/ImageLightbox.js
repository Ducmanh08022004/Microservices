import React, { useEffect } from 'react';
import { X } from 'lucide-react';

function ImageLightbox({ imageUrl, altText, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-close">
        <X size={32} />
      </div>
      <img 
        src={imageUrl} 
        alt={altText || 'Phóng to ảnh'} 
        className="lightbox-img" 
        onClick={(e) => e.stopPropagation()} 
      />
    </div>
  );
}

export default ImageLightbox;
