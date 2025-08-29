import React from 'react';
import { useStudio } from './contexts/StudioContext.tsx';
import { ChevronsLeftIcon } from './icons/ChevronsLeftIcon.tsx';
import { ChevronsRightIcon } from './icons/ChevronsRightIcon.tsx';

interface StudioProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

const Studio: React.FC<StudioProps> = ({ isCollapsed, onToggle }) => {
    const { studioContent, studioSummaryContent, isStudioVisible } = useStudio();

    if (!isStudioVisible) {
        return null;
    }

    return (
        <aside className={`flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-96'}`}>
            <div className={`flex-shrink-0 flex items-center ${isCollapsed ? 'p-3 justify-center' : 'p-4 justify-between'}`}>
                 <h2 className={`font-bold text-zinc-200 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
                    Studio
                </h2>
                <button 
                    onClick={onToggle} 
                    className="p-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                    aria-label={isCollapsed ? 'Expand studio panel' : 'Collapse studio panel'}
                >
                    {isCollapsed ? <ChevronsLeftIcon className="h-5 w-5" /> : <ChevronsRightIcon className="h-5 w-5" />}
                </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
                {/* Expanded content */}
                <div className={`absolute inset-0 overflow-y-auto p-4 transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {studioContent}
                </div>
                {/* Collapsed content */}
                <div className={`absolute inset-0 transition-opacity duration-300 p-3 ${isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {isCollapsed && studioSummaryContent}
                </div>
            </div>
        </aside>
    );
};

export default Studio;