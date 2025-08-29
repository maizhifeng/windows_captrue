
import React from 'react';

export const SaveIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={1.5}>
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.121 0 1.131.094 1.976 1.057 1.976 2.192V7.5m-9 3.75h9A2.25 2.25 0 0019.5 9V7.5A2.25 2.25 0 0017.25 5.25h-4.5A2.25 2.25 0 008.25 7.5v1.5M12 11.25a2.25 2.25 0 00-2.25 2.25v3.375c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V13.5A2.25 2.25 0 0012 11.25z" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M3 10.5v6A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.5v-6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 10.5z" 
        />
    </svg>
);
