import React from 'react';
import { SaveIcon } from '../icons/SaveIcon.tsx';

interface SavedModelViewProps { savedModelInfo: string | null; }

const SavedModelView: React.FC<SavedModelViewProps> = ({ savedModelInfo }) => {
    const isError = savedModelInfo?.toLowerCase().startsWith('error');
    const defaultText = '在 /public/model 中未找到自定义模型。训练后，请将下载的模型文件放置在该处并重新加载。';

    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200/80 dark:border-zinc-800 shadow-sm">
            <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 mb-2">
                <SaveIcon className="h-5 w-5"/>
                活动的自定义模型
            </h4>
            <p className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {savedModelInfo 
                    ? isError ? savedModelInfo : `已加载: ${savedModelInfo}`
                    : defaultText}
            </p>
        </div>
    );
};

export default SavedModelView;