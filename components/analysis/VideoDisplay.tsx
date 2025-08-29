import React, { useState, useEffect } from 'react';
import { SpinnerIcon } from '../icons/SpinnerIcon.tsx';
import { EyeIcon } from '../icons/EyeIcon.tsx';
import { Detection } from '../utils/api.tsx';

// 一个精心挑选的、美观的调色板，用于对象标签。
const PALETTE = [
    { borderColor: 'hsl(220, 80%, 65%)', backgroundColor: 'hsla(220, 80%, 55%, 0.8)' }, // 蓝色
    { borderColor: 'hsl(150, 75%, 50%)', backgroundColor: 'hsla(150, 75%, 40%, 0.8)' }, // 绿色
    { borderColor: 'hsl(327, 85%, 60%)', backgroundColor: 'hsla(327, 85%, 55%, 0.8)' }, // 粉色
    { borderColor: 'hsl(262, 80%, 65%)', backgroundColor: 'hsla(262, 80%, 55%, 0.8)' }, // 紫色
    { borderColor: 'hsl(39, 95%, 60%)', backgroundColor: 'hsla(39, 95%, 55%, 0.8)' },  // 琥珀色
    { borderColor: 'hsl(0, 85%, 65%)', backgroundColor: 'hsla(0, 85%, 60%, 0.8)' },  // 红色
    { borderColor: 'hsl(180, 80%, 50%)', backgroundColor: 'hsla(180, 80%, 40%, 0.8)' }, // 青色
    { borderColor: 'hsl(240, 80%, 70%)', backgroundColor: 'hsla(240, 80%, 65%, 0.8)' }, // 靛蓝色
];

/**
 * 将字符串转换为哈希值，用于一致地选择颜色。
 * @param str - 输入字符串 (标签名称)。
 * @returns 一个非负整数。
 */
const stringToHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // 转换为 32 位整数
    }
    return Math.abs(hash);
};

/**
 * 根据标签名称获取一致的颜色样式。
 * @param label - 对象的类名。
 * @returns 包含边框和背景颜色的样式对象。
 */
const getLabelStyle = (label: string) => {
    const hash = stringToHash(label);
    return PALETTE[hash % PALETTE.length];
};

interface VideoDisplayProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    isCapturing: boolean;
    isAnalyzing: boolean;
    detections: Detection[];
}

/**
 * 视频显示组件，负责播放屏幕捕获的视频流，并叠加检测到的边界框。
 */
const VideoDisplay: React.FC<VideoDisplayProps> = ({ videoRef, isCapturing, isAnalyzing, detections }) => {
    // 视频在容器内实际渲染的尺寸和位置，用于正确缩放边界框
    const [videoRenderDim, setVideoRenderDim] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!isCapturing || !video) {
            setVideoRenderDim(null);
            return;
        }

        // 计算视频在 'object-contain' 模式下的实际渲染尺寸
        const updateDimensions = () => {
            if (video.videoWidth === 0 || video.videoHeight === 0) return;
            const videoAspectRatio = video.videoWidth / video.videoHeight;
            const containerWidth = video.clientWidth;
            const containerHeight = video.clientHeight;
            const containerAspectRatio = containerWidth / containerHeight;

            let renderWidth = containerWidth, renderHeight = containerHeight, xOffset = 0, yOffset = 0;

            // 如果视频比容器更宽（"letterboxed" on top/bottom）
            if (videoAspectRatio > containerAspectRatio) {
                renderHeight = containerWidth / videoAspectRatio;
                yOffset = (containerHeight - renderHeight) / 2;
            } else { // 如果视频比容器更高（"pillarboxed" on left/right）
                renderWidth = containerHeight * videoAspectRatio;
                xOffset = (containerWidth - renderWidth) / 2;
            }
            setVideoRenderDim({ x: xOffset, y: yOffset, width: renderWidth, height: renderHeight });
        };

        // 使用 ResizeObserver 监听容器尺寸变化
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (video.parentElement) {
            resizeObserver.observe(video.parentElement);
        }
        
        // 初始计算
        if (video.readyState >= 2) updateDimensions();
        else video.onloadeddata = updateDimensions;

        return () => {
            resizeObserver.disconnect();
            if (video) video.onloadeddata = null;
        };
    }, [isCapturing, videoRef]);

    return (
        <div className="relative w-full h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center">
            <video
                ref={videoRef}
                className="w-full h-full object-contain transition-opacity duration-500"
                style={{ opacity: isCapturing ? 1 : 0 }}
                playsInline muted
            />

            {/* 未捕获时的占位符 */}
            {!isCapturing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 p-4 z-10">
                    <EyeIcon className="h-12 w-12 mb-4 text-zinc-400 dark:text-zinc-500"/>
                    <p className="font-semibold text-lg text-zinc-700 dark:text-zinc-200">
                        开始捕获以进行监控
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">选择一个游戏或应用程序窗口以开始。</p>
                </div>
            )}
            
            {/* 边界框叠加层 */}
            {isCapturing && videoRenderDim && (
                <div className="absolute inset-0 pointer-events-none" style={{ left: `${videoRenderDim.x}px`, top: `${videoRenderDim.y}px`, width: `${videoRenderDim.width}px`, height: `${videoRenderDim.height}px`}}>
                    {detections.map((det, index) => {
                        const style = getLabelStyle(det.class);
                        const labelText = `${det.class} (${Math.round(det.score * 100)}%)`;
                        
                        // 将归一化坐标转换为像素坐标
                        const boxX = det.box.x1 * videoRenderDim.width;
                        const boxY = det.box.y1 * videoRenderDim.height;
                        const boxWidth = (det.box.x2 - det.box.x1) * videoRenderDim.width;
                        const boxHeight = (det.box.y2 - det.box.y1) * videoRenderDim.height;
                        
                        // 避免渲染尺寸过小的框
                        if (boxWidth < 1 || boxHeight < 1) return null;

                        return (
                            <div
                                key={index}
                                className="absolute border-2 rounded-sm shadow-lg"
                                style={{
                                    left: `${boxX}px`, top: `${boxY}px`,
                                    width: `${boxWidth}px`, height: `${boxHeight}px`,
                                    borderColor: style.borderColor,
                                }}
                            >
                                <span
                                    className="absolute left-0 text-xs font-semibold px-1.5 py-0.5 rounded-sm text-white whitespace-nowrap"
                                    style={{ 
                                        backgroundColor: style.backgroundColor,
                                        bottom: 'calc(100% + 2px)', // 定位在框的上方
                                    }}
                                >
                                    {labelText}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* "分析中..." 指示器 */}
            <div className={`absolute top-4 right-4 flex items-center gap-2 bg-zinc-50/80 dark:bg-zinc-900/70 backdrop-blur-sm px-3 py-1.5 rounded-full transition-opacity duration-300 pointer-events-none shadow-md ${isCapturing && isAnalyzing ? 'opacity-100' : 'opacity-0'}`}>
                <SpinnerIcon />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">分析中...</span>
            </div>
        </div>
    );
};

export default VideoDisplay;