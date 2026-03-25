import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseClass = variant === 'icon' ? 'btn-icon-only' : `btn btn-${variant}`;
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
