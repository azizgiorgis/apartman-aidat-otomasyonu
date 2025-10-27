import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, title, children, onClose, footer }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={onClose} 
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-transform duration-300 scale-100"
                onClick={(e) => e.stopPropagation()} 
            >
                
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6">
                    {children}
                </div>
                
                {footer && (
                    <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;