import React from 'react';
import { SaveIcon } from '../icons/SaveIcon.tsx';

interface SavedModelViewProps { savedModelInfo: string | null; }

const SavedModelView: React.FC<SavedModelViewProps> = ({ savedModelInfo }) => {
    const isError = savedModelInfo?.toLowerCase().startsWith('error');
    const defaultText = 'No custom model found in /public/model. After training, place the downloaded model files there and reload.';

    return (
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
            <h4 className="font-semibold text-zinc-200 flex items-center gap-2 mb-2">
                <SaveIcon className="h-5 w-5"/>
                Active Custom Model
            </h4>
            <p className={`text-sm ${isError ? 'text-red-400' : 'text-zinc-400'}`}>
                {savedModelInfo 
                    ? isError ? savedModelInfo : `Loaded: ${savedModelInfo}`
                    : defaultText}
            </p>
        </div>
    );
};

export default SavedModelView;