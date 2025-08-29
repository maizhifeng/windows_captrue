
import React from 'react';

export const ReloadIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}>
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M4 4v5h5M20 20v-5h-5" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M20 4L8.5 15.5M4 20l11.5-11.5" 
        />
         <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M19.95 11.26A8 8 0 1012.74 4.05"
        />
    </svg>
);
