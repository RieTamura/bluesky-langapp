import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  children, 
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'btn focus-visible';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary', 
    danger: 'btn-danger'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button 
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="spinner w-4 h-4 mr-2" />
      )}
      {children}
    </button>
  );
}