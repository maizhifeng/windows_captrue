import React from 'react';
import type { Mode } from '../App.tsx';

interface MainPanelHeaderProps {
    mode: Mode;
}

const MODE_TITLES: Record<Mode, string> = {
    analysis: 'Live Analysis',
    dataset: 'Dataset Management',
    training: 'Train Model',
    vqa: 'Visual Q&A',
    settings: 'Settings'
};

const MainPanelHeader: React.FC<MainPanelHeaderProps> = ({ mode }) => {
    const title = MODE_TITLES[mode];

    return (
        <header className="flex-shrink-0 flex items-center px-4 py-3">
            <h2 className="text-lg font-bold text-zinc-200">
                {title}
            </h2>
        </header>
    );
};

export default MainPanelHeader;