import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraIcon } from '../icons/CameraIcon.tsx';
import { RobotIcon } from '../icons/RobotIcon.tsx';
import { SpinnerIcon } from '../icons/SpinnerIcon.tsx';
import { api } from '../utils/api.tsx';

interface AnnotationViewProps {
    onFrameCaptured: (imageData: ImageData) => void;
    onAutoCapturedFrame: (imageData: ImageData) => void;
}

/**
 * 数据收集组件，提供屏幕共享预览，并支持手动和自动捕获帧。
 */
const AnnotationView: React.FC<AnnotationViewProps> = ({ onFrameCaptured, onAutoCapturedFrame }) => {
    // 状态
    const [isCapturing, setIsCapturing] = useState(false); // 是否正在屏幕共享
    const [error, setError] = useState<string | null>(null);
    const [isAutoCapturing, setIsAutoCapturing] = useState(false); // 是否启用了自动捕获
    const [autoCaptureInterval, setAutoCaptureInterval] = useState(1.5); // 自动捕获的冷却时间（秒）
    const [autoCaptureConfidence, setAutoCaptureConfidence] = useState(0.75); // 自动捕获的置信度阈值
    const [autoCaptureMaxSize, setAutoCaptureMaxSize] = useState(0.3); // 自动捕获的最大对象尺寸
    const [showCaptureFlash, setShowCaptureFlash] = useState(false); // 控制捕获时的闪烁效果
    const [captureMode, setCaptureMode] = useState<'manual' | 'auto'>('manual'); // 当前捕获模式
    const [isDetecting, setIsDetecting] = useState(false); // 自动捕获是否正在检测当前帧
    const [cocoModel, setCocoModel] = useState<any>(null); // 用于浏览器端检测的模型
    const [isModelLoading, setIsModelLoading] = useState(true); // 模型加载状态
    
    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const lastAutoCaptureTimeRef = useRef<number>(0); // 上次自动捕获的时间戳

    // 停止屏幕共享
    const stopCapture = useCallback(() => {
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        streamRef.current = null;
        setIsCapturing(false);
        setIsAutoCapturing(false); // 停止共享时也停止自动捕获
    }, []);

    // 开始屏幕共享
    const startCapture = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }});
            if (videoRef.current) {
                 videoRef.current.srcObject = stream;
                 await videoRef.current.play();
            }
            streamRef.current = stream;
            stream.getVideoTracks()[0].onended = stopCapture; // 当用户停止共享时调用
            setIsCapturing(true);
        } catch (err) { setError("无法开始屏幕捕获。请授予权限。"); }
    }, [stopCapture]);
    
    // 加载 COCO-SSD 模型
    useEffect(() => {
        const MAX_RETRIES = 10;
        let attempt = 0;
        
        async function loadModelWithRetry() {
            if (typeof cocoSsd !== 'undefined' && cocoSsd.load) {
                try {
                    const model = await cocoSsd.load();
                    setCocoModel(model);
                } catch (e) {
                    console.error("加载 COCO-SSD 失败:", e);
                    setError("无法加载浏览器内的检测模型。");
                } finally {
                    setIsModelLoading(false);
                }
            } else {
                attempt++;
                if (attempt < MAX_RETRIES) {
                    setTimeout(loadModelWithRetry, 500); // 重试
                } else {
                    setError("对象检测库加载超时。请刷新页面重试。");
                    setIsModelLoading(false);
                }
            }
        }
        
        loadModelWithRetry();
    }, []);


    // 组件卸载时清理
    useEffect(() => { return () => stopCapture(); }, [stopCapture]);

    // 手动捕获当前帧
    const captureFrame = useCallback(() => {
        if (!videoRef.current || videoRef.current.videoWidth === 0) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // 将 ImageData 传递给父组件进行处理
            onFrameCaptured(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
    }, [onFrameCaptured]);
    
    // 运行自动捕获逻辑
    const runAutoCaptureFrame = useCallback(async () => {
        // 防止重入和过于频繁的调用
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || isDetecting || !cocoModel) return;
        if (performance.now() - lastAutoCaptureTimeRef.current < autoCaptureInterval * 1000) return;

        const video = videoRef.current;
        if (video.videoWidth === 0) return;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth; tempCanvas.height = video.videoHeight;
        const { width: imageWidth, height: imageHeight } = tempCanvas;
        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        setIsDetecting(true);
        try {
            // 使用浏览器内的 COCO-SSD 模型进行检测
            const predictions = await cocoModel.detect(tempCanvas);
            
            const imageArea = imageWidth * imageHeight;
            // 按置信度和尺寸过滤预测结果
            const validPredictions = predictions.filter((p: any) => {
                if (p.score < autoCaptureConfidence) return false;
                const [_x, _y, w, h] = p.bbox;
                const boxArea = w * h;
                // 检查框面积是否小于最大尺寸阈值
                return (boxArea / imageArea) <= autoCaptureMaxSize;
            });

            // 如果有任何有效的预测结果
            if (validPredictions.length > 0) {
                lastAutoCaptureTimeRef.current = performance.now();
                // 将捕获的帧传递给父组件
                onAutoCapturedFrame(ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height));
                // 触发闪烁效果
                setShowCaptureFlash(true);
                setTimeout(() => setShowCaptureFlash(false), 400);
            }
        } catch (e) {
            console.error('自动捕获检测失败', e);
            // 不停止自动捕获，只记录错误并继续
        } finally {
            setIsDetecting(false);
        }

    }, [onAutoCapturedFrame, autoCaptureConfidence, autoCaptureInterval, isDetecting, cocoModel, autoCaptureMaxSize]);

    // 设置和清除自动捕获的定时器
    useEffect(() => {
        let intervalId: number | null = null;
        if (isAutoCapturing) intervalId = window.setInterval(runAutoCaptureFrame, 500); // 每 500ms 检查一次
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [isAutoCapturing, runAutoCaptureFrame]);

    return (
        <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200/80 dark:border-zinc-800 h-full flex flex-col">
            {/* 视频预览区域 */}
            <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain" />
                <div className={`absolute inset-0 border-4 border-blue-500 rounded-md pointer-events-none transition-opacity duration-300 z-10 ${showCaptureFlash ? 'opacity-100' : 'opacity-0'}`}></div>
                {!isCapturing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 p-4 text-center">
                        <CameraIcon className="h-10 w-10 mb-2 text-zinc-400 dark:text-zinc-500"/>
                        <p className="font-semibold text-zinc-700 dark:text-zinc-200">开始屏幕共享</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">选择一个窗口以收集数据。</p>
                    </div>
                )}
                {error && <div className="absolute bottom-4 left-4 right-4 bg-red-50/80 dark:bg-red-900/30 border border-red-200 dark:border-red-500/50 text-red-800 dark:text-red-300 p-3 rounded-lg text-sm text-center" role="alert">{error}</div>}
            </div>
            
            <div className="space-y-4 flex-grow flex flex-col">
                <button onClick={isCapturing ? stopCapture : startCapture} className={`px-4 py-2.5 font-semibold rounded-lg shadow-sm w-full disabled:bg-slate-600 disabled:cursor-not-allowed text-base transition-colors text-white ${ isCapturing ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isCapturing ? '停止屏幕共享' : '开始屏幕共享'}
                </button>
                
                {/* 仅在屏幕共享时显示捕获选项 */}
                {isCapturing && (
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700 flex-grow flex flex-col">
                        <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-t-lg border-b border-zinc-200 dark:border-zinc-700">
                            <button onClick={() => setCaptureMode('manual')} disabled={isAutoCapturing} className={`flex-1 px-4 py-1.5 text-sm font-semibold text-center transition-colors rounded-md disabled:opacity-50 ${captureMode === 'manual' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-700/60'}`}>手动捕获</button>
                            <button onClick={() => setCaptureMode('auto')} disabled={isAutoCapturing || isModelLoading} className={`flex-1 px-4 py-1.5 text-sm font-semibold text-center transition-colors rounded-md disabled:opacity-50 ${captureMode === 'auto' ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-zinc-100 shadow-sm' : 'text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-700/60'}`}>自动捕获</button>
                        </div>

                        <div className="p-4 flex-grow">
                            {captureMode === 'manual' && (
                                <div className="space-y-3 flex flex-col h-full justify-center">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">单击下面的按钮以从视频流中捕获当前帧进行标注。</p>
                                    <button onClick={captureFrame} disabled={isAutoCapturing} className="px-4 py-2 font-semibold rounded-lg shadow-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 disabled:bg-slate-600 w-full">
                                        <CameraIcon className="h-5 w-5"/> 捕获帧
                                    </button>
                                </div>
                            )}
                            {captureMode === 'auto' && (
                                <div className="space-y-4">
                                    {isModelLoading ? (
                                        <div className="flex items-center justify-center text-zinc-500 dark:text-zinc-400 gap-2"><SpinnerIcon/><span>加载模型...</span></div>
                                    ) : (
                                    <>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">当通用模型检测到任何对象时，自动捕获帧。</p>
                                        <div>
                                            <label htmlFor="confidence-slider" className="flex justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"><span>置信度</span><span className="font-mono">{Math.round(autoCaptureConfidence * 100)}%</span></label>
                                            <input id="confidence-slider" type="range" min="0.2" max="0.9" step="0.05" value={autoCaptureConfidence} onChange={(e) => setAutoCaptureConfidence(parseFloat(e.target.value))} disabled={isAutoCapturing} className="w-full h-2 bg-zinc-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 disabled:opacity-50"/>
                                        </div>
                                        <div>
                                            <label htmlFor="max-size-slider" className="flex justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"><span>最大对象尺寸</span><span className="font-mono">{Math.round(autoCaptureMaxSize * 100)}%</span></label>
                                            <input id="max-size-slider" type="range" min="0.05" max="0.95" step="0.05" value={autoCaptureMaxSize} onChange={(e) => setAutoCaptureMaxSize(parseFloat(e.target.value))} disabled={isAutoCapturing} className="w-full h-2 bg-zinc-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 disabled:opacity-50"/>
                                        </div>
                                        <div>
                                            <label htmlFor="interval-slider" className="flex justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"><span>冷却时间</span><span className="font-mono">{autoCaptureInterval.toFixed(1)}s</span></label>
                                            <input id="interval-slider" type="range" min="0.5" max="10" step="0.5" value={autoCaptureInterval} onChange={(e) => setAutoCaptureInterval(parseFloat(e.target.value))} disabled={isAutoCapturing} className="w-full h-2 bg-zinc-200 dark:bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500 disabled:opacity-50"/>
                                        </div>
                                        <button onClick={() => setIsAutoCapturing(p => !p)} disabled={!cocoModel} className={`w-full px-4 py-2 font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:bg-slate-600 transition-colors text-white ${isAutoCapturing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                            {isAutoCapturing ? <SpinnerIcon /> : <RobotIcon/>}
                                            {isAutoCapturing ? (isDetecting ? '检测中...' : '暂停自动捕获') : '开始自动捕获'}
                                        </button>
                                    </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnnotationView;
