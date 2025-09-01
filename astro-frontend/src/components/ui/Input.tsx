import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export default function Input({ 
  label, 
  error, 
  helpText, 
  className = '', 
  id,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={`form-input ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''} ${className}`}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
    </div>
  );
}