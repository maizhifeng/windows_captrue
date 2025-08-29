import React from 'react';
import { TrashIcon } from '../icons/TrashIcon.tsx';
import { ArchiveIcon } from '../icons/ArchiveIcon.tsx';
import { StoredTrainingSample } from '../utils/api.tsx';
import { GoogleDriveIcon } from '../icons/GoogleDriveIcon.tsx';
import { SpinnerIcon } from '../icons/SpinnerIcon.tsx';
import { type AuthStatus } from '../contexts/GoogleAuthContext.tsx';

interface SamplesViewProps {
    samples: StoredTrainingSample[];
    onDeleteSample: (id: number) => void;
    onClearAllSamples: () => void;
    onSelectSample: (sample: StoredTrainingSample) => void;
    onExportSamples: () => void;
    onExportToDrive: () => void;
    authStatus: AuthStatus;
    isGoogleSignedIn: boolean;
    isUploadingToDrive: boolean;
    onSignIn: () => void;
    onSignOut: () => void;
    selectedSampleId?: number;
    authError: string | null;
}

const SamplesView: React.FC<SamplesViewProps> = ({ 
    samples, onDeleteSample, onClearAllSamples, onSelectSample, onExportSamples,
    onExportToDrive, authStatus, isGoogleSignedIn, isUploadingToDrive,
    onSignIn, onSignOut, selectedSampleId, authError
}) => {

    const renderAuthContent = () => {
        switch (authStatus) {
            case 'initializing':
                return (
                    <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <SpinnerIcon />
                        <span>正在初始化...</span>
                    </div>
                );
            // FIX: Handle the 'missing_keys' status to correctly display an error state.
            case 'missing_keys':
            case 'error':
                 return (
                    <p className="text-xs text-center text-red-600 dark:text-red-400">
                        Google Drive 初始化失败。
                    </p>
                );
            case 'ready':
                if (isGoogleSignedIn) {
                    return (
                        <button 
                            onClick={onSignOut} 
                            className="px-3 py-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-md transition-colors"
                        >
                            注销
                        </button>
                    );
                }
                return (
                     <button 
                        onClick={onSignIn} 
                        className="px-3 py-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                    >
                        登录
                    </button>
                );
            default:
                return null;
        }
    };


    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 flex justify-between items-center mb-4">
                 <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">数据集 ({samples.length})</h3>
                 {samples.length > 0 && (
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onExportToDrive} 
                            title={authStatus !== 'ready' ? "Google Drive 不可用" : (isGoogleSignedIn ? "导出到 Google Drive" : "请先登录 Google")}
                            disabled={authStatus !== 'ready' || isUploadingToDrive || !isGoogleSignedIn}
                            className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploadingToDrive ? <SpinnerIcon /> : <GoogleDriveIcon className="h-5 w-5"/>}
                        </button>
                        <button onClick={onExportSamples} title="导出所有样本" className="text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"><ArchiveIcon className="h-5 w-5" /></button>
                        <button onClick={onClearAllSamples} title="清空所有样本" className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                 )}
            </div>
            
            {/* Google Drive Auth Section */}
            <div className="flex-shrink-0 mb-4 p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <GoogleDriveIcon className="h-6 w-6" />
                        <div>
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Google Drive 集成</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {isGoogleSignedIn ? '已连接。' : (authStatus === 'ready' ? '登录以导出您的数据集。' : '导出不可用。')}
                            </p>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {renderAuthContent()}
                    </div>
                </div>
                {authError && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-xs whitespace-pre-wrap text-left border border-red-200 dark:border-red-500/30">
                        {authError}
                    </div>
                )}
                {!isGoogleSignedIn && authStatus === 'ready' && !authError && (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-md text-xs border border-blue-200 dark:border-blue-500/30">
                        <p><strong>提示：</strong>如果登录失败，请在<strong>设置</strong>页面检查您的 Google Drive 配置是否正确。</p>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                {samples.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-center text-sm p-4">
                        <p>尚未收集任何样本。请使用捕获工具收集帧。</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                        {samples.map((sample) => (
                           <div 
                                key={sample.id} 
                                className={`relative group aspect-square cursor-pointer rounded-lg transition-all duration-200 overflow-hidden ${selectedSampleId === sample.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-900' : 'ring-1 ring-zinc-200 dark:ring-zinc-700 hover:ring-blue-400 dark:hover:ring-blue-500'}`}
                                onClick={() => onSelectSample(sample)}
                            >
                                <img src={sample.imageUrl} className="w-full h-full object-cover bg-zinc-200 dark:bg-zinc-800" alt={`Sample ${sample.id}`} loading="lazy" />
                                <span className={`absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full ring-2 ring-zinc-50 dark:ring-zinc-900 ${sample.boxes.length > 0 ? 'bg-green-500' : 'bg-amber-500'}`} title={sample.boxes.length > 0 ? '已标注' : '未标注'}></span>

                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-center p-1 rounded-md">
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteSample(sample.id); }} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="h-5 w-5"/></button>
                                    <span className="text-white text-xs mt-1">{sample.boxes.length} 个标签</span>
                                </div>
                           </div>
                        ))}
                    </div>
                )}
            </div>
             {samples.length > 15 && (
                <p className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center px-4">
                    提示：对于非常大的数据集，请考虑浏览器上的性能影响。
                </p>
            )}
        </div>
    );
};

export default SamplesView;
