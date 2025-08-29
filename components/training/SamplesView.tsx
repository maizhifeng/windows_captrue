import React from 'react';
import { TrashIcon } from '../icons/TrashIcon.tsx';
import { ArchiveIcon } from '../icons/ArchiveIcon.tsx';
import { StoredTrainingSample } from '../utils/api.tsx';

interface SamplesViewProps {
    samples: StoredTrainingSample[];
    onDeleteSample: (id: number) => void;
    onClearAllSamples: () => void;
    onSelectSample: (sample: StoredTrainingSample) => void;
    onExportSamples: () => void;
    selectedSampleId?: number;
}

const SamplesView: React.FC<SamplesViewProps> = ({ samples, onDeleteSample, onClearAllSamples, onSelectSample, onExportSamples, selectedSampleId }) => {

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-zinc-200">Dataset ({samples.length})</h3>
                 {samples.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button onClick={onExportSamples} title="Export all samples" className="text-zinc-400 hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-zinc-800"><ArchiveIcon className="h-5 w-5" /></button>
                        <button onClick={onClearAllSamples} title="Clear all samples" className="text-zinc-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-zinc-800"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                 )}
            </div>
            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                {samples.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-center text-sm p-4">
                        <p>No samples collected yet. Use the capture tools to collect frames.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {samples.map((sample) => (
                           <div 
                                key={sample.id} 
                                className={`relative group aspect-square cursor-pointer rounded-md transition-all duration-200 overflow-hidden ${selectedSampleId === sample.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-900' : 'ring-1 ring-zinc-700 hover:ring-blue-500'}`}
                                onClick={() => onSelectSample(sample)}
                            >
                                <img src={sample.imageUrl} className="w-full h-full object-cover bg-zinc-700" alt={`Sample ${sample.id}`} loading="lazy" />
                                <span className={`absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full ring-2 ring-zinc-900 ${sample.boxes.length > 0 ? 'bg-green-400' : 'bg-amber-400'}`} title={sample.boxes.length > 0 ? 'Annotated' : 'Unannotated'}></span>

                                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-center p-1 rounded-md">
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteSample(sample.id); }} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="h-5 w-5"/></button>
                                    <span className="text-white text-xs mt-1">{sample.boxes.length} label{sample.boxes.length !== 1 ? 's' : ''}</span>
                                </div>
                           </div>
                        ))}
                    </div>
                )}
            </div>
             {samples.length > 15 && (
                <p className="flex-shrink-0 text-xs text-zinc-500 mt-3 text-center px-4">
                    Tip: For very large datasets, consider performance implications on the browser.
                </p>
            )}
        </div>
    );
};

export default SamplesView;