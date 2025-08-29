import React from 'react';

export const ModelTrainingIcon: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
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
            d="M10.343 3.94c.09-.542.56-1.007 1.11-1.227l.956-.348c.55-.202 1.182.022 1.54.499l.488.651c.357.477.98.701 1.54.499l.956-.348c.55-.202 1.182.022 1.54.499l.488.651c.357.477.98.701 1.54.499l.956-.348c.55-.202 1.182.022 1.54.499l.488.651c.357.477.98.701 1.54.499l.192.07c.55.202.93.757.93 1.348v5.06c0 .59-.38 1.146-.93 1.348l-.192.07c-.56.202-1.183-.023-1.54-.499l-.488-.651c-.357-.477-.98-.701-1.54-.499l-.956.348c-.55.202-1.182-.023-1.54-.499l-.488-.651c-.357-.477-.98-.701-1.54-.499l-.956.348c-.55.202-1.182-.023-1.54-.499l-.488-.651c-.357-.477-.98-.701-1.54-.499l-1.02-.374a1.125 1.125 0 01-.87-1.125v-1.5c0-.621.504-1.125 1.125-1.125h2.25" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M8.25 7.5l-4.5 4.5 4.5 4.5" 
        />
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M4.5 12h10.5" 
        />
    </svg>
);