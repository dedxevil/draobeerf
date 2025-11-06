import React from 'react';
import { useToastContext, Toast as ToastProps, ToastType } from '../../context/ToastContext';
import { CheckCircleIcon, AlertIcon, InfoIcon, CloseIcon } from '../layout/Icons';

const icons: Record<ToastType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  success: CheckCircleIcon,
  error: AlertIcon,
  warning: AlertIcon,
  info: InfoIcon,
};

const colors: Record<ToastType, { bg: string; text: string; }> = {
    success: { bg: 'bg-green-500', text: 'text-white' },
    error: { bg: 'bg-red-500', text: 'text-white' },
    warning: { bg: 'bg-yellow-500', text: 'text-black' },
    info: { bg: 'bg-blue-500', text: 'text-white' },
};


const Toast: React.FC<{ toast: ToastProps }> = ({ toast }) => {
    const { removeToast } = useToastContext();
    const Icon = icons[toast.type];
    const color = colors[toast.type];

    return (
        <div className={`
            flex items-start p-4 rounded-lg shadow-lg w-full max-w-sm
            ${color.bg} ${color.text}
            animate-toast-in pointer-events-auto
        `}>
            <div className="flex-shrink-0 pt-0.5">
                <Icon className="w-6 h-6" />
            </div>
            <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
                <button
                    onClick={() => removeToast(toast.id)}
                    className="inline-flex rounded-md p-1.5 text-current hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white"
                >
                    <span className="sr-only">Close</span>
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};


export const ToastContainer: React.FC = () => {
    const { toasts } = useToastContext();

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div 
            aria-live="assertive" 
            className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
        >
            <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} />
                ))}
            </div>
        </div>
    );
};