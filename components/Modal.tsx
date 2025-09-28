
import React, { useState, useEffect } from 'react';
import { ModalType } from '../types';

interface ModalProps {
  isOpen: boolean;
  type: ModalType;
  message: string;
  onClose: () => void;
  onConfirm?: (value?: string | boolean) => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, type, message, onClose, onConfirm }) => {
  const [inputValue, setInputValue] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      if (type === 'input') {
        setInputValue('');
      }
    } else {
      setShow(false);
    }
  }, [isOpen, type]);
  
  if (!isOpen) {
    return null;
  }
  
  const handleConfirm = () => {
    if (onConfirm) {
        onConfirm(type === 'confirm' ? true : inputValue);
    }
    onClose();
  };

  const handleCancel = () => {
    if (onConfirm && type === 'confirm') {
        onConfirm(false);
    }
    onClose();
  }
  
  const backdropClasses = `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`;
  const contentClasses = `bg-white rounded-lg p-6 w-11/12 max-w-sm text-center shadow-xl transform transition-all duration-200 ${show ? 'scale-100' : 'scale-95'}`;

  return (
    <div className={backdropClasses} onClick={handleCancel}>
      <div className={contentClasses} onClick={e => e.stopPropagation()}>
        <p className="mb-4 text-lg">{message}</p>
        {type === 'input' && (
          <input
            type="text"
            className="w-full p-2 border rounded-md mb-4"
            placeholder="請在此輸入..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        )}
        <div className="flex justify-center gap-4">
          {(type === 'confirm' || type === 'input') && (
            <button className="btn btn-secondary py-2 px-6 rounded-md" onClick={handleCancel}>
              取消
            </button>
          )}
          <button className="btn btn-primary py-2 px-6 rounded-md" onClick={handleConfirm}>
            {type === 'alert' ? '好的' : '確定'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
