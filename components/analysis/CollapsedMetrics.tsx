import React from 'react';
import { PlayIcon } from '../icons/PlayIcon.tsx';
import { StopIcon } from '../icons/StopIcon.tsx';

interface CollapsedMetricsProps {
    isCapturing: boolean;
    onStartCapture: () => void;
    onStopCapture: () => void;
    fps: number;
    objectCount: number;
    confidence: number;
    analysisFps: number;
}

const MetricDisplay: React.FC<{ value: string; label: string; colorClassName: string; }> = ({ value, label, colorClassName }) => (
    <div>
        <span className={`font-bold text-2xl ${colorClassName}`}>{value}</span>
        <span className="font-medium text-zinc-500 dark:text-zinc-400 block text-xs mt-1">{label}</span>
    </div>
);

/**
 * 一个紧凑的组件，用于在工作室面板折叠时显示关键指标和控件。
 * 采用简洁的数字显示，突出最重要的信息。
 */
const CollapsedMetrics: React.FC<CollapsedMetricsProps> = ({ 
    isCapturing, onStartCapture, onStopCapture,
    fps, objectCount, confidence, analysisFps
}) => {
    return (
        <div className="flex flex-col items-center text-center h-full justify-start gap-6 py-4">
            <button
                onClick={isCapturing ? onStopCapture : onStartCapture}
                aria-label={isCapturing ? 'Stop Capture' : 'Start Capture'}
                className={`w-12 h-12 flex items-center justify-center rounded-full shadow-lg text-white transition-all duration-300 transform hover:scale-110 ${
                    isCapturing ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
            >
                {isCapturing ? <StopIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
            </button>
            
            <div className="w-full space-y-4">
                <MetricDisplay 
                    value={fps.toFixed(1)} 
                    label="FPS" 
                    colorClassName="text-green-600 dark:text-green-400"
                />
                <MetricDisplay 
                    value={objectCount.toString()} 
                    label="对象" 
                    colorClassName="text-blue-600 dark:text-blue-400"
                />
                 <MetricDisplay 
                    value={`${Math.round(confidence * 100)}%`}
                    label="阈值" 
                    colorClassName="text-amber-600 dark:text-amber-400"
                />
                <MetricDisplay 
                    value={analysisFps.toString()}
                    label="目标FPS" 
                    colorClassName="text-purple-600 dark:text-purple-400"
                />
            </div>
        </div>
    );
};

export default CollapsedMetrics;