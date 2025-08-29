
import React from 'react';

export const SpeedometerIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
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
        d="M8.25 4.5l7.5 7.5-7.5 7.5" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M15.75 12c0-1.125-.9-2.062-2-2.062s-2.062.937-2.062 2.062c0 1.125.925 2 2.062 2s2-.875 2-2Z"
      />
    </svg>
);
