

import React from 'react';
import { SettingsIcon } from '../icons/SettingsIcon.tsx';

// Interface defining all the props required by the controls
interface AnalysisControlsProps {
    isCapturing: boolean;
    isAnalyzing: boolean;
    onStartCapture: () => void;
    onStopCapture: () => void;
    
    detectionEngine: 'frontend' | 'backend';
    onSetDetectionEngine: (engine: 'frontend' | 'backend') => void;
    
    selectedModel: 'coco' | 'custom';
    onSetSelectedModel: (model: 'coco' | 'custom') => void;
    hasCustomModel: boolean;
    isCocoSsdReady: boolean;

    confidence: number;
    onConfidenceChange: (value: number) => void;
    analysisFps: number;
    onAnalysisFpsChange: (value: number) => void;
}

/**
 * 一个专用的组件，用于实时分析工作室面板中的所有用户控件。
 * 它提供了一个简洁的、上下文感知的界面，在捕获期间会禁用配置。
 */
const AnalysisControls: React.FC<AnalysisControlsProps> = ({
    isCapturing, isAnalyzing, onStartCapture, onStopCapture,
    detectionEngine, onSetDetectionEngine,
    selectedModel, onSetSelectedModel, hasCustomModel, isCocoSsdReady,
    confidence, onConfidenceChange, analysisFps, onAnalysisFpsChange
}) => {
    
    return (
        <div className="space-y-4">
            {/* 主要操作：开始/停止捕获按钮 */}
            <button 
                onClick={isCapturing ? onStopCapture : onStartCapture}
                className={`px-6 py-3 font-semibold rounded-lg shadow-lg w-full text-white transition-all duration-200 transform hover:scale-[1.02] ${isCapturing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isCapturing ? 'Stop Capture' : 'Start Capture'}
            </button>

            {/* 配置部分：在捕获时禁用 */}
            <fieldset disabled={isCapturing} className="space-y-4 transition-opacity duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                 <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 pt-2">
                    <SettingsIcon className="w-4 h-4" />
                    Configuration
                </h3>
                <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700 w-full flex flex-col gap-4 text-sm space-y-3">
                    {/* 引擎选择 */}
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-300 font-medium">Engine:</span>
                        <div className="flex items-center gap-2">
                            <button disabled={!isCocoSsdReady} onClick={() => onSetDetectionEngine('frontend')} className={`px-3 py-1 rounded-md ${detectionEngine === 'frontend' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'} disabled:opacity-50`}>Browser</button>
                            <button onClick={() => onSetDetectionEngine('backend')} className={`px-3 py-1 rounded-md ${detectionEngine === 'backend' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}>Server</button>
                        </div>
                    </div>
                    {/* 模型选择 (仅限后端) */}
                    {detectionEngine === 'backend' && (
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-300 font-medium">Model:</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onSetSelectedModel('coco')} className={`px-3 py-1 rounded-md ${selectedModel === 'coco' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'}`}>COCO</button>
                                <button disabled={!hasCustomModel} onClick={() => onSetSelectedModel('custom')} className={`px-3 py-1 rounded-md ${selectedModel === 'custom' ? 'bg-blue-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600'} disabled:opacity-50`}>Custom</button>
                            </div>
                        </div>
                    )}
                </div>
                {/* 参数滑块 */}
                <div className="space-y-4 pt-2">
                    <div>
                        <label htmlFor="confidence" className="flex justify-between text-sm font-medium text-zinc-300 mb-2">
                            <span>Confidence Threshold</span>
                            <span className="font-mono">{Math.round(confidence * 100)}%</span>
                        </label>
                        <input id="confidence" type="range" min="0.2" max="0.9" step="0.05" value={confidence} onChange={(e) => onConfidenceChange(parseFloat(e.target.value))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                    <div>
                        <label htmlFor="fps" className="flex justify-between text-sm font-medium text-zinc-300 mb-2">
                            <span>Analysis Frequency</span>
                            <span className="font-mono">{analysisFps} FPS</span>
                        </label>
                        <input id="fps" type="range" min="1" max="30" step="1" value={analysisFps} onChange={(e) => onAnalysisFpsChange(parseInt(e.target.value, 10))} className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                    </div>
                </div>
            </fieldset>
        </div>
    );
};

export default AnalysisControls;