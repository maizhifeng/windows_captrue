import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon.tsx';
import VideoDisplay from './analysis/VideoDisplay.tsx';
import LiveAnalysisStudio from './analysis/LiveAnalysisStudio.tsx';
import CollapsedMetrics from './analysis/CollapsedMetrics.tsx';
import { api, Detection } from './utils/api.tsx';
import { useStudio } from './contexts/StudioContext.tsx';

interface LiveAnalysisProps { hasCustomModel: boolean; }

const LiveAnalysis: React.FC<LiveAnalysisProps> = ({ hasCustomModel }) => {
    // State
    const [isCapturing, setIsCapturing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<'coco' | 'custom'>('coco');
    const [frontendModel, setFrontendModel] = useState<'mobilenet_v2' | 'lite_mobilenet_v2'>('mobilenet_v2');
    const [realtimeFps, setRealtimeFps] = useState(0);

    // Analysis params
    const [confidence, setConfidence] = useState(0.5);
    const [analysisFps, setAnalysisFps] = useState(5);

    // Engine and model loading status
    const [detectionEngine, setDetectionEngine] = useState<'frontend' | 'backend'>('frontend');
    const [isCocoSsdReady, setIsCocoSsdReady] = useState(false);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const cocoSsdModelRef = useRef<any>(null);
    const animationFrameId = useRef<number | null>(null);
    const lastAnalysisTime = useRef(0);
    const frameTimes = useRef<number[]>([]);

    // Studio context
    const { setStudioContent, setStudioSummaryContent } = useStudio();

    const objectCounts = useMemo(() => {
        const counts = new Map<string, number>();
        detections.forEach(det => {
            counts.set(det.class, (counts.get(det.class) || 0) + 1);
        });
        return counts;
    }, [detections]);

    const totalDetections = useMemo(() => detections.length, [detections]);

    const stopCapture = useCallback(() => {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        
        animationFrameId.current = null;
        streamRef.current = null;
        setIsCapturing(false);
        setIsAnalyzing(false);
        setDetections([]);
        setRealtimeFps(0);
        frameTimes.current = [];
    }, []);

    const startCapture = useCallback(async () => {
        stopCapture();
        setError(null);
        try {
            // FIX: The 'cursor' property for getDisplayMedia is not in all TypeScript DOM lib versions. Cast to any to fix.
            const stream: MediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30, cursor: 'never' } as any,
                audio: false,
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            streamRef.current = stream;
            const track = stream.getVideoTracks()[0];
            track.onended = stopCapture;
            setIsCapturing(true);
        } catch (err) {
            setError('Could not start screen capture. Please grant permission.');
        }
    }, [stopCapture]);

    useEffect(() => {
        setStudioContent(
             <LiveAnalysisStudio
                isCapturing={isCapturing}
                isAnalyzing={isAnalyzing}
                onStartCapture={startCapture}
                onStopCapture={stopCapture}
                detectionEngine={detectionEngine}
                onSetDetectionEngine={setDetectionEngine}
                selectedModel={selectedModel}
                onSetSelectedModel={setSelectedModel}
                hasCustomModel={hasCustomModel}
                isCocoSsdReady={isCocoSsdReady}
                confidence={confidence}
                onConfidenceChange={setConfidence}
                analysisFps={analysisFps}
                onAnalysisFpsChange={setAnalysisFps}
                objectCounts={objectCounts}
                totalDetections={totalDetections}
                realtimeFps={realtimeFps}
             />
        );
        
        setStudioSummaryContent(
            <CollapsedMetrics 
                fps={realtimeFps} 
                objectCount={totalDetections}
                confidence={confidence}
                analysisFps={analysisFps}
                isCapturing={isCapturing}
                onStartCapture={startCapture}
                onStopCapture={stopCapture}
            />
        );

        return () => {
            setStudioContent(null);
            setStudioSummaryContent(null);
        };
    }, [
        setStudioContent, setStudioSummaryContent,
        isCapturing, isAnalyzing, startCapture, stopCapture,
        detectionEngine, selectedModel, hasCustomModel, isCocoSsdReady,
        confidence, analysisFps,
        objectCounts, totalDetections, realtimeFps
    ]);

    useEffect(() => {
        async function loadCocoSsd() {
            try {
                if (typeof cocoSsd !== 'undefined' && !cocoSsdModelRef.current) {
                    cocoSsdModelRef.current = await cocoSsd.load({ base: frontendModel });
                    setIsCocoSsdReady(true);
                }
            } catch (e) {
                console.error('Failed to load COCO-SSD model:', e);
                setError('Could not load frontend object detection model.');
            }
        }
        loadCocoSsd();
    }, [frontendModel]);


    const analyzeFrame = useCallback(async () => {
        // 即使不分析，也要继续请求帧，以保持动画循环
        if (!isCapturing || !videoRef.current || videoRef.current.readyState < 2) {
            animationFrameId.current = requestAnimationFrame(analyzeFrame);
            return;
        }
    
        const video = videoRef.current;
        const currentTime = performance.now();
        const interval = 1000 / analysisFps;
    
        // 仅根据选定的 FPS 运行分析
        if (currentTime - lastAnalysisTime.current >= interval) {
            lastAnalysisTime.current = currentTime;
    
            if (detectionEngine === 'backend') {
                setIsAnalyzing(true);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d')?.drawImage(video, 0, 0);
                    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
                    const newDetections = await api.analyzeFrame(base64Image, selectedModel);
                    setDetections(newDetections);
                } catch (err: any) {
                    setError(`Backend analysis failed: ${err.message}.`);
                } finally {
                    setIsAnalyzing(false);
                }
            } else if (detectionEngine === 'frontend' && cocoSsdModelRef.current) {
                setIsAnalyzing(true);
                try {
                    const model = cocoSsdModelRef.current;
                    // 使用更简单的 `detect` 方法，它在 WebGL 下效率很高
                    const predictions = await model.detect(video, 20, confidence);
                    
                    // 将模型返回的基于像素的边界框归一化
                    const normalizedDetections: Detection[] = predictions.map((p: any) => {
                        const [x, y, width, height] = p.bbox;
                        return {
                            class: p.class,
                            score: p.score,
                            box: {
                                x1: x / video.videoWidth,
                                y1: y / video.videoHeight,
                                x2: (x + width) / video.videoWidth,
                                y2: (y + height) / video.videoHeight,
                            }
                        };
                    });
                    
                    // 保留了原有的对超大框的过滤器
                    const sizeFilteredDetections = normalizedDetections.filter(det => {
                        const boxWidth = det.box.x2 - det.box.x1;
                        const boxHeight = det.box.y2 - det.box.y1;
                        return (boxWidth * boxHeight * 100) <= 30;
                    });
    
                    setDetections(sizeFilteredDetections);
    
                } catch (err: any) {
                    console.error("Frontend analysis failed:", err);
                    setError(`Analysis failed: ${err.message}. Stopping capture.`);
                    stopCapture();
                } finally {
                    setIsAnalyzing(false);
                }
            }
            
            // 为两个引擎更新 FPS 计算
            frameTimes.current.push(currentTime);
            frameTimes.current = frameTimes.current.filter(t => t > currentTime - 1000);
            setRealtimeFps(frameTimes.current.length);
        }
    
        animationFrameId.current = requestAnimationFrame(analyzeFrame);
    }, [isCapturing, analysisFps, confidence, detectionEngine, selectedModel, stopCapture]);

    
    useEffect(() => {
        if (isCapturing) {
            animationFrameId.current = requestAnimationFrame(analyzeFrame);
        }
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, [isCapturing, analyzeFrame]);

    return (
         <div className="flex flex-col h-full gap-4">
            <div className="flex-grow min-h-0">
                <VideoDisplay 
                    videoRef={videoRef} isCapturing={isCapturing}
                    isAnalyzing={isAnalyzing} detections={detections}
                />
            </div>
             {error && <div className="bg-amber-900/50 border border-amber-700 text-amber-300 p-3 rounded-lg text-sm text-center" role="alert">{error}</div>}
        </div>
    );
};

export default LiveAnalysis;
