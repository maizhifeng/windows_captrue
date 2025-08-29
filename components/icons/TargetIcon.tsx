
import React from 'react';

export const TargetIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M15.59 14.37a6.04 6.04 0 0 1-5.18 0m5.18 0a4.5 4.5 0 0 0-5.18 0m5.18 0a3 3 0 0 0-5.18 0M12 12a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" 
      />
    </svg>
);
