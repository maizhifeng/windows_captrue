
import React from 'react';

export const PercentIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
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
        d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v.75c0 .414.336.75.75.75h.75v-.75a2.25 2.25 0 0 1 2.25-2.25h.75A2.25 2.25 0 0 1 12 7.5v.75c0 .414.336.75.75.75h.75a2.25 2.25 0 0 0 2.25-2.25v-.75a2.25 2.25 0 0 0-2.25-2.25h-.75A2.25 2.25 0 0 0 9 7.5v.75c0 .414.336.75.75.75h.75" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M15 19.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M6.75 6.75l10.5 10.5" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M9 4.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" 
      />
    </svg>
);
