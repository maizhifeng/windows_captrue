
import React from 'react';

export const PlayIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        viewBox="0 0 24 24" 
        fill="currentColor"
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347c.75.412.75 1.559 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" 
        />
    </svg>
);
