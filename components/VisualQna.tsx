

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from './utils/api.tsx';
import { SpinnerIcon } from './icons/SpinnerIcon.tsx';
import { CameraIcon } from './icons/CameraIcon.tsx';
import { TextIcon } from './icons/TextIcon.tsx';
import { EyeIcon } from './icons/EyeIcon.tsx';
import { useStudio } from './contexts/StudioContext.tsx';

/**
 * 视觉问答（VQA）组件。
 * 允许用户捕获屏幕截图，并就截图内容向 AI 提问。
 */
const VisualQna: React.FC = () => {
    // 状态
    const [isCapturing, setIsCapturing] = useState(false); // 是否正在进行屏幕捕获
    const [capturedFrame, setCapturedFrame] = useState<string | null>(null); // 捕获的帧，以 base64 Data URL 形式存储
    const [question, setQuestion] = useState(''); // 用户输入的问题
    const [answer, setAnswer] = useState(''); // AI 的回答
    const [isAsking, setIsAsking] = useState(false); // 是否正在等待 AI 回答
    const [error, setError] = useState<string | null>(null); // 错误信息

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const { setStudioContent } = useStudio();
    // 此页面不使用工作室面板
    useEffect(() => {
        setStudioContent(null);
        return () => setStudioContent(null);
    }, [setStudioContent]);

    // 停止屏幕捕获并清理资源
    const stopCapture = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        streamRef.current = null;
        setIsCapturing(false);
    }, []);
    
    // 组件卸载时停止捕获
    useEffect(() => {
        return () => stopCapture();
    }, [stopCapture]);
    
    // 开始屏幕捕获
    const startCapture = async () => {
        setError(null);
        setCapturedFrame(null);
        setAnswer('');
        setQuestion('');
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            streamRef.current = stream;
            stream.getVideoTracks()[0].onended = stopCapture;
            setIsCapturing(true);
        } catch (err) {
            console.error("启动屏幕捕获时出错:", err);
            setError("无法开始屏幕捕获。请授予权限。");
            setIsCapturing(false);
        }
    };
    
    // 捕获当前视频帧
    const captureFrame = useCallback(() => {
        if (!videoRef.current || videoRef.current.videoWidth === 0) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // 将帧转换为高质量的 JPEG Data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedFrame(dataUrl);
            stopCapture(); // 捕获后立即停止屏幕共享
        }
    }, [stopCapture]);

    // 向后端 API 发送问题和图像
    const handleAskQuestion = async () => {
        if (!capturedFrame || !question.trim()) return;
        
        setIsAsking(true);
        setError(null);
        setAnswer('');
        
        try {
            const result = await api.askVisualQuestion(capturedFrame, question);
            setAnswer(result);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : '与 AI 模型通信时发生错误。');
        } finally {
            setIsAsking(false);
        }
    };
    
    // 重新捕获图像
    const handleRecapture = () => {
        setCapturedFrame(null);
        setAnswer('');
        setQuestion('');
        startCapture();
    };

    return (
        <div className="max-w-3xl mx-auto h-full flex flex-col justify-center">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-zinc-100">视觉问答</h2>
                <p className="mt-2 max-w-xl mx-auto text-zinc-400">从您的屏幕捕获一帧，并就其内容向 AI 提问。</p>
            </div>

            {/* 步骤 1: 捕获图像 */}
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                    <CameraIcon className="h-6 w-6" />
                    1. 捕获图像
                </h3>
                <div className="relative aspect-video bg-black rounded-md overflow-hidden border border-zinc-700 flex items-center justify-center">
                    {capturedFrame ? (
                        <img src={capturedFrame} alt="捕获的帧" className="w-full h-full object-contain" />
                    ) : (
                        <video ref={videoRef} className={`w-full h-full object-contain ${isCapturing ? 'opacity-100' : 'opacity-0'}`} playsInline muted />
                    )}
                    {!isCapturing && !capturedFrame && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                            <EyeIcon className="h-10 w-10 mb-2 text-zinc-500"/>
                            <p className="font-semibold text-zinc-300">开始屏幕共享以捕获一帧。</p>
                        </div>
                    )}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isCapturing && !capturedFrame && (
                        <button onClick={startCapture} className="w-full sm:col-span-2 px-4 py-2.5 font-semibold text-white rounded-lg shadow-md bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">开始屏幕共享</button>
                    )}
                    {isCapturing && (
                        <>
                        <button onClick={captureFrame} className="w-full px-4 py-2.5 font-semibold text-white rounded-lg shadow-md bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors">捕获帧</button>
                        <button onClick={stopCapture} className="w-full px-4 py-2.5 font-semibold rounded-lg shadow-md bg-zinc-700 hover:bg-zinc-600 transition-colors">取消</button>
                        </>
                    )}
                    {capturedFrame && (
                        <button onClick={handleRecapture} className="w-full sm:col-span-2 px-4 py-2.5 font-semibold rounded-lg shadow-md bg-zinc-700 hover:bg-zinc-600 transition-colors">捕获另一帧</button>
                    )}
                </div>
            </div>

            {/* 步骤 2: 提问 */}
            <div className={`bg-zinc-800/50 p-4 rounded-xl border border-zinc-700 mt-6 space-y-4 transition-opacity duration-500 ${!capturedFrame ? 'opacity-40 cursor-not-allowed' : ''}`}>
                 <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                    <TextIcon className="h-6 w-6" />
                    2. 提出问题
                </h3>
                <textarea 
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    disabled={!capturedFrame || isAsking}
                    placeholder="例如，巴士是什么颜色的？或者，描述一下这个场景。"
                    rows={3}
                    className="w-full bg-zinc-800 text-white text-base px-4 py-2.5 rounded-lg border border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-70"
                />
                <button onClick={handleAskQuestion} disabled={!capturedFrame || isAsking || !question.trim()} className="w-full px-6 py-3 font-semibold text-white rounded-lg shadow-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-3 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all">
                    {isAsking ? <SpinnerIcon /> : null}
                    {isAsking ? '思考中...' : '询问 AI'}
                </button>
                {/* AI 回答显示区域 */}
                {answer && (
                    <div className="pt-4 border-t border-zinc-700/80 space-y-2">
                        <h4 className="font-semibold text-zinc-300">AI 回答:</h4>
                        <div className="bg-zinc-900/50 p-4 border border-zinc-700 rounded-lg text-zinc-300 whitespace-pre-wrap text-sm">{answer}</div>
                    </div>
                )}
            </div>
            {error && <div className="bg-amber-900/50 border border-amber-700 text-amber-300 p-4 rounded-lg mt-6" role="alert">{error}</div>}
        </div>
    );
};

export default VisualQna;