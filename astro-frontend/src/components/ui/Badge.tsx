import React from 'react';

interface BadgeProps {
  variant: 'unknown' | 'learning' | 'known';
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ 
  variant, 
  children, 
  className = '' 
}: BadgeProps) {
  const variantClasses = {
    unknown: 'status-badge-unknown',
    learning: 'status-badge-learning',
    known: 'status-badge-known'
  };
  
  const classes = [
    variantClasses[variant],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <span className={classes}>
      {children}
    </span>
  );
}