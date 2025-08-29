import React from 'react';
import { EyeIcon } from './icons/EyeIcon.tsx';
import { ArchiveIcon } from './icons/ArchiveIcon.tsx';
import { BrainIcon } from './icons/BrainIcon.tsx';
import { SettingsIcon } from './icons/SettingsIcon.tsx';
import { TextIcon } from './icons/TextIcon.tsx';
import { ChevronsLeftIcon } from './icons/ChevronsLeftIcon.tsx';
import { ChevronsRightIcon } from './icons/ChevronsRightIcon.tsx';
import type { Mode } from '../App.tsx';

interface SidebarProps {
    mode: Mode;
    setMode: (mode: Mode) => void;
    isCollapsed: boolean;
    onToggle: () => void;
}

const navItems = [
    { id: 'analysis', label: 'Live Analysis', icon: EyeIcon },
    { id: 'dataset', label: 'Dataset', icon: ArchiveIcon },
    { id: 'training', label: 'Train Model', icon: BrainIcon },
    { id: 'vqa', label: 'Visual Q&A', icon: TextIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;


const Sidebar: React.FC<SidebarProps> = ({ mode, setMode, isCollapsed, onToggle }) => {
    return (
        <aside className={`flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-56'}`}>
            <div className={`h-full flex flex-col ${isCollapsed ? 'p-2' : 'p-3'}`}>
                <div className={`flex items-center mb-6 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    <h1 className={`text-lg font-bold text-zinc-200 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                        AI Vision
                    </h1>
                    <button 
                        onClick={onToggle} 
                        className="p-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <ChevronsRightIcon className="h-5 w-5" /> : <ChevronsLeftIcon className="h-5 w-5" />}
                    </button>
                </div>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = mode === item.id;
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => setMode(item.id)}
                                        aria-current={isActive ? 'page' : undefined}
                                        title={isCollapsed ? item.label : undefined}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-200 text-sm font-medium ${isCollapsed ? 'justify-center' : ''} ${
                                            isActive
                                                ? 'bg-zinc-800 text-white'
                                                : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
                                        }`}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{item.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;