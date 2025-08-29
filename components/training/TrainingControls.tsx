import React from 'react';
import { SpinnerIcon } from '../icons/SpinnerIcon.tsx';
import { ModelTrainingIcon } from '../icons/ModelTrainingIcon.tsx';

interface TrainingControlsProps {
    status: string; isTraining: boolean;
    trainingProgress: { epoch: number; loss: string; accuracy: string };
    onStartTraining: () => void; canTrain: boolean; sampleCount: number;
}

const TrainingControls: React.FC<TrainingControlsProps> = ({ status, isTraining, trainingProgress, onStartTraining, canTrain, sampleCount }) => {
    return (
        <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-sm">
                <h4 className="font-semibold text-zinc-700 dark:text-zinc-300">训练状态</h4>
                <p className="text-zinc-500 dark:text-zinc-400 font-mono text-right truncate" title={status}>{status}</p>
            </div>
            
            {isTraining && (
                 <div className="space-y-2 text-sm font-mono">
                     <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{width: `${(trainingProgress.epoch/20)*100}%`}}></div>
                    </div>
                     <div className="grid grid-cols-3 gap-4 text-center pt-2">
                         <div><span className="text-zinc-500 dark:text-zinc-400 block text-xs">轮次</span> <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">{trainingProgress.epoch} / 20</span></div>
                         <div><span className="text-zinc-500 dark:text-zinc-400 block text-xs">损失</span> <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">{trainingProgress.loss}</span></div>
                         <div><span className="text-zinc-500 dark:text-zinc-400 block text-xs">准确率</span> <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">{trainingProgress.accuracy}</span></div>
                     </div>
                 </div>
            )}
            
             <button onClick={onStartTraining} disabled={isTraining || !canTrain} className="w-full px-6 py-3 font-semibold text-white rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-3 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all">
                {isTraining ? <SpinnerIcon /> : <ModelTrainingIcon className="h-6 w-6" />}
                {isTraining ? '正在训练...' : `开始训练 (${sampleCount} 个样本)`}
            </button>
        </div>
    );
};

export default TrainingControls;