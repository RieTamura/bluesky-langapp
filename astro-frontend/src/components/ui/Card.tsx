import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function Card({ 
  children, 
  className = '', 
  hover = false,
  padding = 'md'
}: CardProps) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const classes = [
    'card',
    hover ? 'card-hover' : '',
    paddingClasses[padding],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={classes}>
      {children}
    </div>
  );
}