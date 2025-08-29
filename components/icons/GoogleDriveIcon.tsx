import React from 'react';

export const GoogleDriveIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 32 27.4"
        role="img" aria-label="Google Drive icon">
        <g>
            <path fill="#4285f4" d="M21.1 12.4l-6.2 10.7 6.2 10.7h12.3l6.2-10.7-6.2-10.7z"/>
            <path fill="#fbbc04" d="M9.4 0L0 16.2l6.2 10.7 9.3-16.2L9.4 0z"/>
            <path fill="#34a853" d="M27.3 10.7L18.1 27l-6.2-10.7L21.1 5.4l6.2 5.3z"/>
        </g>
    </svg>
);
