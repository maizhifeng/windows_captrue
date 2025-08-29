import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BoxData } from '../utils/api.tsx';
import { TrashIcon } from '../icons/TrashIcon.tsx';
import { PlusIcon } from '../icons/PlusIcon.tsx';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon.tsx';
import { ArrowRightIcon } from '../icons/ArrowRightIcon.tsx';

// 定义标注会话的数据结构
interface AnnotationSession {
    id?: number;
    imageData: ImageData;
    imageUrl?: string;
    boxes: BoxData[];
}

interface DetectedBox { box: [number, number, number, number]; label?: string; }
interface SampleEditorModalProps {
    session: AnnotationSession; onSave: (session: AnnotationSession) => void; onClose: () => void;
    onNavigate: (direction: 'prev' | 'next') => void; canGoPrevious: boolean; canGoNext: boolean;
}

/**
 * 样本编辑器模态框，用于查看、标注和编辑单个捕获的帧。
 */
const SampleEditorModal: React.FC<SampleEditorModalProps> = ({ session, onSave, onClose, onNavigate, canGoPrevious, canGoNext }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]); // 图像上所有框的列表（已标注或未标注）
    const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null); // 鼠标悬停的框的索引
    const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null); // 当前选中的框的索引
    
    // 手动绘制状态
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
    const [currentRect, setCurrentRect] = useState<[number, number, number, number] | null>(null);

    // 从 localStorage 加载/保存标签列表
    const [labels, setLabels] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('annotationLabels') || '["player", "enemy", "npc"]'); }
        catch { return ['player', 'enemy', 'npc']; }
    });
    const [newLabelInput, setNewLabelInput] = useState('');

    // 当标签列表更新时，保存到 localStorage
    useEffect(() => { localStorage.setItem('annotationLabels', JSON.stringify(labels)); }, [labels]);

    // 当会话改变时（即加载新样本），重置状态
    useEffect(() => {
        setSelectedBoxIndex(null);
        setHoveredBoxIndex(null);
        // 如果样本已经有标注，则直接加载它们
        if (session.boxes.length > 0) {
            setDetectedBoxes(session.boxes.map(b => ({ box: b.box, label: b.label })));
        } else {
            // 对于新样本，从一个空的列表开始
            setDetectedBoxes([]);
        }
    }, [session]);

    const removeBox = (index: number) => {
        setDetectedBoxes(p => p.filter((_, i) => i !== index));
        if (selectedBoxIndex === index) setSelectedBoxIndex(null);
    };

    // 键盘快捷键处理
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxIndex !== null) removeBox(selectedBoxIndex);
            if (e.key === 'ArrowLeft' && canGoPrevious) onNavigate('prev');
            if (e.key === 'ArrowRight' && canGoNext) onNavigate('next');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, selectedBoxIndex, onNavigate, canGoPrevious, canGoNext]);

    // 在 canvas 上绘制图像和所有边界框
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !session.imageData) return;
        // 计算 canvas 的尺寸以适应其容器，保持图像的纵横比
        const { clientWidth, clientHeight } = canvas.parentElement!;
        const { width: imgW, height: imgH } = session.imageData;
        const imgAspect = imgW / imgH, containerAspect = clientWidth / clientHeight;
        let w = clientWidth, h = clientHeight;
        if (imgAspect > containerAspect) h = clientWidth / imgAspect; else w = clientHeight * imgAspect;
        canvas.width = w; canvas.height = h;
        
        // 将 ImageData 绘制到 canvas
        const tempCanvas = document.createElement('canvas'); tempCanvas.width = imgW; tempCanvas.height = imgH;
        tempCanvas.getContext('2d')!.putImageData(session.imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, w, h);
        
        // 绘制每个边界框
        detectedBoxes.forEach((b, index) => {
             const { box, label } = b; const [y1, x1, y2, x2] = box;
             const isSel = selectedBoxIndex === index, isHov = hoveredBoxIndex === index;
             if (label) { // 已标注的框
                ctx.strokeStyle = isSel ? '#dc2626' : isHov ? '#f59e0b' : '#3b82f6'; // 红, 琥珀, 蓝
                ctx.lineWidth = isSel ? 3 : 2;
                ctx.strokeRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);
                ctx.fillStyle = isSel ? '#dc2626' : '#3b82f6'; // 红, 蓝
                ctx.font = 'bold 12px sans-serif';
                ctx.fillRect(x1 * w - 1, y1 * h - 16, ctx.measureText(label).width + 8, 16);
                ctx.fillStyle = '#fff'; ctx.fillText(label, x1 * w + 3, y1 * h - 4);
             } else { // 未标注的框
                ctx.strokeStyle = isSel ? '#3b82f6' : isHov ? '#94a3b8' : '#64748b'; // 蓝, 灰, 深灰
                ctx.lineWidth = isSel ? 3 : 1.5; ctx.setLineDash([4, 2]); // 虚线
                ctx.strokeRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);
                ctx.setLineDash([]);
             }
        });

        // 绘制当前正在创建的框的预览
        if (currentRect) {
            const [y1, x1, y2, x2] = currentRect;
            ctx.strokeStyle = '#f59e0b'; // 琥珀色
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);
            ctx.setLineDash([]);
        }
    }, [session.imageData, detectedBoxes, hoveredBoxIndex, selectedBoxIndex, currentRect]);

    // 监听容器尺寸变化并重绘 canvas
    useEffect(() => {
        const obs = new ResizeObserver(() => drawCanvas());
        if (canvasRef.current?.parentElement) obs.observe(canvasRef.current.parentElement);
        drawCanvas();
        return () => obs.disconnect();
    }, [drawCanvas]);
    
    // 获取鼠标在 canvas 上的归一化坐标
    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        };
    };
    
    // 处理鼠标按下事件：开始绘制
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const pos = getMousePos(e);
        if (!pos) return;
        setIsDrawing(true);
        setStartPoint(pos);
        setCurrentRect(null);
    };
    
    // 处理鼠标移动事件：更新绘制预览或处理悬停效果
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = getMousePos(e);
        if (!pos) return;
        
        if (isDrawing && startPoint) {
            const newRect: [number, number, number, number] = [
                Math.min(startPoint.y, pos.y), // y1
                Math.min(startPoint.x, pos.x), // x1
                Math.max(startPoint.y, pos.y), // y2
                Math.max(startPoint.x, pos.x), // x2
            ];
            setCurrentRect(newRect);
        } else {
            let found = false;
            for (let i = detectedBoxes.length - 1; i >= 0; i--) {
                const [y1, x1, y2, x2] = detectedBoxes[i].box;
                if (pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2) { setHoveredBoxIndex(i); found = true; break; }
            }
            if (!found) setHoveredBoxIndex(null);
        }
    };
    
    // 处理鼠标抬起事件：完成绘制或选择框
    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !startPoint) return;
        
        const endPoint = getMousePos(e);
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentRect(null);
        if (!endPoint) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const clickThreshold = 5;
        const movedX = Math.abs(startPoint.x - endPoint.x) * canvas.width;
        const movedY = Math.abs(startPoint.y - endPoint.y) * canvas.height;
        
        if (movedX < clickThreshold && movedY < clickThreshold) {
            // 这是单击，处理选择逻辑
            let foundBox = false;
            for (let i = detectedBoxes.length - 1; i >= 0; i--) {
                const [y1, x1, y2, x2] = detectedBoxes[i].box;
                if (endPoint.x >= x1 && endPoint.x <= x2 && endPoint.y >= y1 && endPoint.y <= y2) {
                    setSelectedBoxIndex(i);
                    foundBox = true;
                    break;
                }
            }
            if (!foundBox) setSelectedBoxIndex(null);
        } else {
            // 这是拖拽，创建一个新框
            const newBox: DetectedBox = {
                box: [
                    Math.min(startPoint.y, endPoint.y),
                    Math.min(startPoint.x, endPoint.x),
                    Math.max(startPoint.y, endPoint.y),
                    Math.max(startPoint.x, endPoint.x),
                ]
            };
            setDetectedBoxes(prev => [...prev, newBox]);
            setSelectedBoxIndex(detectedBoxes.length); // 选中新创建的框
        }
    };

    // 为选中的框分配标签
    const handleAssignLabel = (label: string) => {
        if (selectedBoxIndex === null) { setError("在分配标签前请先选择一个框。"); return; }
        setError(null);
        setDetectedBoxes(p => p.map((b, i) => i === selectedBoxIndex ? {...b, label} : b));
    };

    // 添加新标签到标签列表
    const handleAddNewLabel = (e: React.FormEvent) => {
        e.preventDefault();
        const newLabel = newLabelInput.toLowerCase().trim().replace(/\s+/g, '_');
        if (newLabel && !labels.includes(newLabel)) {
            setLabels([...labels, newLabel]);
            setNewLabelInput('');
        }
    };
    
    // 从标签列表中删除一个标签
    const handleDeleteLabel = (labelToDelete: string) => {
        if (window.confirm(`确认删除标签 "${labelToDelete}" 吗？这将会移除此图像中所有使用该标签的框的标签。`)) {
            setLabels(labels.filter(l => l !== labelToDelete));
            setDetectedBoxes(p => p.map(b => b.label === labelToDelete ? { ...b, label: undefined } : b));
        }
    };

    // 保存标注结果
    const handleSave = () => {
        const labeledBoxes: BoxData[] = detectedBoxes.filter((b): b is Required<DetectedBox> => !!b.label).map(b => ({ label: b.label, box: b.box }));
        if (labeledBoxes.length === 0) { setError("在保存前请至少标注一个框。"); return; }
        onSave({ ...session, boxes: labeledBoxes });
    };

    const labeledBoxCount = detectedBoxes.filter(b => b.label).length;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 sm:p-6 lg:p-8 flex items-center justify-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-7xl h-full bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 flex flex-col md:flex-row gap-4" onMouseDown={e => e.stopPropagation()}>
                {/* 左侧：图像和控制 */}
                <div className="flex-grow flex flex-col gap-4 min-h-0">
                     <div className="relative flex-grow bg-zinc-100 dark:bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                        <canvas 
                            ref={canvasRef} 
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={() => { if(isDrawing) { setIsDrawing(false); setStartPoint(null); setCurrentRect(null); }}}
                        />
                        {detectedBoxes.length === 0 && !isDrawing && (
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <p className="bg-black/50 text-white text-sm px-3 py-1.5 rounded-md">点击并拖拽以绘制一个框</p>
                            </div>
                        )}
                        {/* 导航按钮 */}
                        <button onClick={() => onNavigate('prev')} disabled={!canGoPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 rounded-full disabled:opacity-30 transition-all shadow-md" aria-label="上一个样本"><ArrowLeftIcon className="h-6 w-6 text-zinc-800 dark:text-zinc-200" /></button>
                        <button onClick={() => onNavigate('next')} disabled={!canGoNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 rounded-full disabled:opacity-30 transition-all shadow-md" aria-label="下一个样本"><ArrowRightIcon className="h-6 w-6 text-zinc-800 dark:text-zinc-200" /></button>
                     </div>
                     <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
                        <button onClick={handleSave} disabled={labeledBoxCount === 0} className="px-4 py-2.5 font-semibold text-white rounded-lg shadow-sm w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">保存样本 ({labeledBoxCount} 个已标注)</button>
                        <button onClick={onClose} className="px-4 py-2.5 font-semibold rounded-lg shadow-sm w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100">关闭</button>
                     </div>
                </div>

                {/* 右侧：标签和对象列表 */}
                <aside className="w-full md:w-72 flex-shrink-0 space-y-4 flex flex-col">
                    <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2 text-sm">标签</h4>
                        <form onSubmit={handleAddNewLabel} className="flex gap-2 mb-3">
                            <input type="text" value={newLabelInput} onChange={e => setNewLabelInput(e.target.value)} placeholder="添加新标签..." className="bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"/>
                            <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"><PlusIcon /></button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            {labels.map(label => (
                                <div key={label} className="relative group">
                                    <button onClick={() => handleAssignLabel(label)} className="px-2.5 py-1 text-xs font-semibold rounded-md transition-colors bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-200">{label}</button>
                                    <button onClick={() => handleDeleteLabel(label)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full h-4 w-4 text-white text-xs items-center justify-center opacity-0 group-hover:opacity-100 flex transition-opacity">&times;</button>
                                </div>
                            ))}
                        </div>
                        {error && <p className="text-amber-600 dark:text-amber-400 text-xs mt-2 text-center">{error}</p>}
                    </div>
                    
                    <div className="bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 flex-grow flex flex-col min-h-0">
                        <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 mb-2 text-sm">对象 ({detectedBoxes.length})</h4>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2 -mr-2">
                            {detectedBoxes.length === 0 && <p className="text-zinc-500 dark:text-zinc-400 text-sm p-2 text-center">此图像中没有标注。请在左侧图像上绘制框以开始。</p>}
                            {detectedBoxes.map((b, i) => (
                                <div key={i} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedBoxIndex === i ? 'bg-blue-100 dark:bg-blue-900/50' : hoveredBoxIndex === i ? 'bg-zinc-200 dark:bg-zinc-700/50' : 'bg-white dark:bg-zinc-800'}`}
                                    onMouseEnter={() => setHoveredBoxIndex(i)} onMouseLeave={() => setHoveredBoxIndex(null)} onClick={() => setSelectedBoxIndex(i)}>
                                    <span className={`text-sm font-medium capitalize ${selectedBoxIndex === i ? 'text-blue-800 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                        框 {i + 1}: <span className={b.label ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}>{b.label || '未标注'}</span>
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); removeBox(i); }} className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-500 p-1"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default SampleEditorModal;