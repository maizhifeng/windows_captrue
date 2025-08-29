

import React from 'react';
import DetectionResults from './DetectionResults.tsx';
import AnalysisControls from './AnalysisControls.tsx';

// Define all the props being passed to this component
interface LiveAnalysisStudioProps {
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

    objectCounts: Map<string, number>;
    totalDetections: number;
    realtimeFps: number;
}

/**
 * LiveAnalysisStudio component, which acts as the control center for the live analysis mode
 * within the studio panel. It's now structured to separate results from controls.
 */
const LiveAnalysisStudio: React.FC<LiveAnalysisStudioProps> = (props) => {
    return (
        <div className="flex flex-col h-full">
            {/* Main content area: Real-time metrics and results */}
            <div className="flex-grow min-h-0">
                <DetectionResults 
                    objectCounts={props.objectCounts} 
                    totalDetections={props.totalDetections}
                    realtimeFps={props.realtimeFps}
                />
            </div>

            {/* Bottom bar: All controls and configuration */}
            <div className="flex-shrink-0 pt-4 mt-4 border-t border-zinc-700">
                <AnalysisControls {...props} />
            </div>
        </div>
    );
};

export default LiveAnalysisStudio;