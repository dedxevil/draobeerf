import React, { ReactNode, useEffect } from 'react';
import Tooltip from './Tooltip';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'default' | 'large';
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, size = 'default' }) => {
  // Effect to handle Escape key press for closing the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  const sizeClasses = size === 'large' ? 'max-w-6xl' : 'max-w-2xl';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`bg-surface rounded-lg shadow-xl w-full ${sizeClasses} max-h-[90vh] flex flex-col transform transition-all`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-secondary/20">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <Tooltip text="Close (Esc)" position="bottom">
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Tooltip>
        </header>
        <div className="p-6 overflow-y-auto freeboard-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;