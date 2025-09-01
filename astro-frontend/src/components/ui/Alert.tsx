import React from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Alert({ 
  type, 
  title, 
  children, 
  className = '' 
}: AlertProps) {
  const typeClasses = {
    success: 'alert-success',
    error: 'alert-error',
    warning: 'alert-warning',
    info: 'alert-info'
  };
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const classes = [
    typeClasses[type],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes} role="alert">
      <div className="flex items-start">
        <span className="mr-2 text-lg" aria-hidden="true">
          {icons[type]}
        </span>
        <div className="flex-1">
          {title && (
            <h3 className="font-semibold mb-1">
              {title}
            </h3>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}