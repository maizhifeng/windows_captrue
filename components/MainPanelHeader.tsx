import React from 'react';
import type { Mode } from '../App.tsx';

interface MainPanelHeaderProps {
    mode: Mode;
}

const MODE_TITLES: Record<Mode, string> = {
    analysis: '实时分析',
    dataset: '数据集管理',
    training: '模型训练',
    vqa: '视觉问答',
    settings: '设置'
};

const MainPanelHeader: React.FC<MainPanelHeaderProps> = ({ mode }) => {
    const title = MODE_TITLES[mode];

    return (
        <header className="flex-shrink-0 flex items-center px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                {title}
            </h2>
        </header>
    );
};

export default MainPanelHeader;