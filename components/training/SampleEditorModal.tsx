import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BoxData } from '../utils/api.tsx';
import { TrashIcon } from '../icons/TrashIcon.tsx';
import { PlusIcon } from '../icons/PlusIcon.tsx';
import { SpinnerIcon } from '../icons/SpinnerIcon.tsx';
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
    const [isDetecting, setIsDetecting] = useState(true); // 是否正在进行自动对象检测
    const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]); // 图像上所有框的列表（已标注或未标注）
    const [hoveredBoxIndex, setHoveredBoxIndex] = useState<number | null>(null); // 鼠标悬停的框的索引
    const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null); // 当前选中的框的索引
    const [cocoModel, setCocoModel] = useState<any>(null); // 用于浏览器端检测的模型
    // 从 localStorage 加载/保存标签列表
    const [labels, setLabels] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('annotationLabels') || '["player", "enemy", "npc"]'); }
        catch { return ['player', 'enemy', 'npc']; }
    });
    const [newLabelInput, setNewLabelInput] = useState('');

    // 当标签列表更新时，保存到 localStorage
    useEffect(() => { localStorage.setItem('annotationLabels', JSON.stringify(labels)); }, [labels]);

    // 加载 COCO-SSD 模型
    useEffect(() => {
        async function loadModel() {
            if (typeof cocoSsd !== 'undefined' && cocoSsd.load) {
                try {
                    const model = await cocoSsd.load();
                    setCocoModel(model);
                } catch (e) {
                    console.error("加载 COCO-SSD 失败:", e);
                    setError("无法加载浏览器内的检测模型。");
                }
            }
        }
        loadModel();
    }, []);

    // 当会话（即编辑的样本）或模型改变时，运行自动对象检测
    useEffect(() => {
        setSelectedBoxIndex(null); setHoveredBoxIndex(null);
        // 如果样本已经有标注，则直接加载它们
        if (session.id !== undefined && session.boxes.length > 0) {
            setDetectedBoxes(session.boxes.map(b => ({ box: b.box, label: b.label })));
            setIsDetecting(false); return;
        }
        const runDetection = async () => {
             // 等待模型加载完成
            if (!session.imageData || !cocoModel) {
                if (typeof cocoSsd !== 'undefined' && !cocoModel) {
                    setIsDetecting(true); // 模型正在加载时显示加载动画
                } else {
                    setIsDetecting(false);
                }
                return;
            };
            setIsDetecting(true); setError(null);
            
            // 将 ImageData 转换为 Canvas 以便进行检测
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = session.imageData.width;
            tempCanvas.height = session.imageData.height;
            const ctx = tempCanvas.getContext('2d');
            if(!ctx) { setIsDetecting(false); return; }
            ctx.putImageData(session.imageData, 0, 0);

            try {
                 // 使用浏览器内的 COCO-SSD 模型进行预检测
                const predictions = await cocoModel.detect(tempCanvas);
                const { width, height } = tempCanvas;
                setDetectedBoxes(predictions.map((p: any) => {
                    const [x, y, w, h] = p.bbox;
                    // 将像素坐标转换为归一化的 [y1, x1, y2, x2] 格式
                    return { 
                        box: [
                            y / height,         // y1
                            x / width,          // x1
                            (y + h) / height,   // y2
                            (x + w) / width,    // x2
                        ] 
                    };
                }));
            } catch (e) { 
                setError("无法自动检测对象。");
                console.error("前端检测时出错：", e);
            }
            finally { setIsDetecting(false); }
        };
        runDetection();
    }, [session, cocoModel]);

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
                ctx.strokeStyle = isSel ? '#f87171' : isHov ? '#fbbf24' : '#60a5fa'; // 红, 琥珀, 蓝
                ctx.lineWidth = isSel ? 3 : 2;
                ctx.strokeRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);
                ctx.fillStyle = isSel ? '#f87171' : '#3b82f6'; // 红, 蓝
                ctx.font = 'bold 12px sans-serif';
                ctx.fillRect(x1 * w - 1, y1 * h - 16, ctx.measureText(label).width + 8, 16);
                ctx.fillStyle = '#fff'; ctx.fillText(label, x1 * w + 3, y1 * h - 4);
             } else { // 未标注的框
                ctx.strokeStyle = isSel ? '#60a5fa' : isHov ? '#cbd5e1' : '#6b7280'; // 蓝, 灰, 深灰
                ctx.lineWidth = isSel ? 3 : 1.5; ctx.setLineDash([4, 2]); // 虚线
                ctx.strokeRect(x1 * w, y1 * h, (x2 - x1) * w, (y2 - y1) * h);
                ctx.setLineDash([]);
             }
        });
    }, [session.imageData, detectedBoxes, hoveredBoxIndex, selectedBoxIndex]);

    // 监听容器尺寸变化并重绘 canvas
    useEffect(() => {
        const obs = new ResizeObserver(() => drawCanvas());
        if (canvasRef.current?.parentElement) obs.observe(canvasRef.current.parentElement);
        drawCanvas();
        return () => obs.disconnect();
    }, [drawCanvas]);
    
    // 处理 canvas 上的点击事件以选择框
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        for (let i = detectedBoxes.length - 1; i >= 0; i--) {
            const [y1, x1, y2, x2] = detectedBoxes[i].box;
            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) { setSelectedBoxIndex(i); return; }
        }
        setSelectedBoxIndex(null); // 点击空白区域取消选择
    };

    // 处理 canvas 上的鼠标移动事件以高亮框
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        let found = false;
        for (let i = detectedBoxes.length - 1; i >= 0; i--) {
            const [y1, x1, y2, x2] = detectedBoxes[i].box;
            if (x >= x1 && x <= x2 && y >= y1 && y <= y2) { setHoveredBoxIndex(i); found = true; break; }
        }
        if (!found) setHoveredBoxIndex(null);
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
        <div className="fixed inset-0 z-50 bg-black/80 p-4 sm:p-6 lg:p-8 flex items-center justify-center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-7xl h-full bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl p-4 flex flex-col md:flex-row gap-4" onMouseDown={e => e.stopPropagation()}>
                {/* 左侧：图像和控制 */}
                <div className="flex-grow flex flex-col gap-4 min-h-0">
                     <div className="relative flex-grow bg-black rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center">
                        <canvas ref={canvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-crosshair" onClick={handleCanvasClick} onMouseMove={handleMouseMove}/>
                        {isDetecting && (
                            <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center text-zinc-300 z-20">
                                <SpinnerIcon /> <p className="mt-2">正在自动检测对象...</p>
                            </div>
                        )}
                        {/* 导航按钮 */}
                        <button onClick={() => onNavigate('prev')} disabled={!canGoPrevious} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-full disabled:opacity-30 transition-all" aria-label="上一个样本"><ArrowLeftIcon className="h-6 w-6 text-white" /></button>
                        <button onClick={() => onNavigate('next')} disabled={!canGoNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-full disabled:opacity-30 transition-all" aria-label="下一个样本"><ArrowRightIcon className="h-6 w-6 text-white" /></button>
                     </div>
                     <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
                        <button onClick={handleSave} disabled={labeledBoxCount === 0} className="px-4 py-2.5 font-semibold text-white rounded-lg shadow-md w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed">保存样本 ({labeledBoxCount} 个已标注)</button>
                        <button onClick={onClose} className="px-4 py-2.5 font-semibold rounded-lg shadow-md w-full bg-zinc-700 hover:bg-zinc-600">关闭</button>
                     </div>
                </div>

                {/* 右侧：标签和对象列表 */}
                <aside className="w-full md:w-72 flex-shrink-0 space-y-4 flex flex-col">
                    <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700">
                        <h4 className="font-semibold text-zinc-300 mb-2 text-sm">标签</h4>
                        <form onSubmit={handleAddNewLabel} className="flex gap-2 mb-3">
                            <input type="text" value={newLabelInput} onChange={e => setNewLabelInput(e.target.value)} placeholder="添加新标签..." className="bg-zinc-700 text-white text-sm px-3 py-2 rounded-md border border-zinc-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"/>
                            <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"><PlusIcon /></button>
                        </form>
                        <div className="flex flex-wrap gap-2">
                            {labels.map(label => (
                                <div key={label} className="relative group">
                                    <button onClick={() => handleAssignLabel(label)} className="px-2.5 py-1 text-xs font-semibold rounded-md transition-colors bg-zinc-700 hover:bg-zinc-600 text-zinc-300">{label}</button>
                                    <button onClick={() => handleDeleteLabel(label)} className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full h-4 w-4 text-white text-xs items-center justify-center opacity-0 group-hover:opacity-100 flex transition-opacity">&times;</button>
                                </div>
                            ))}
                        </div>
                        {error && <p className="text-amber-400 text-xs mt-2 text-center">{error}</p>}
                    </div>
                    
                    <div className="bg-zinc-800 p-3 rounded-lg border border-zinc-700 flex-grow flex flex-col min-h-0">
                        <h4 className="font-semibold text-zinc-300 mb-2 text-sm">对象 ({detectedBoxes.length})</h4>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-2 -mr-2">
                            {!isDetecting && detectedBoxes.length === 0 && <p className="text-zinc-500 text-sm p-2 text-center">未自动检测到对象。请尝试捕获不同的帧。</p>}
                            {detectedBoxes.map((b, i) => (
                                <div key={i} className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedBoxIndex === i ? 'bg-blue-900/50' : hoveredBoxIndex === i ? 'bg-zinc-700' : 'bg-zinc-800/50'}`}
                                    onMouseEnter={() => setHoveredBoxIndex(i)} onMouseLeave={() => setHoveredBoxIndex(null)} onClick={() => setSelectedBoxIndex(i)}>
                                    <span className={`text-sm font-medium capitalize ${selectedBoxIndex === i ? 'text-white' : 'text-zinc-300'}`}>
                                        框 {i + 1}: <span className={b.label ? 'text-blue-400 font-semibold' : 'text-zinc-500'}>{b.label || '未标注'}</span>
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); removeBox(i); }} className="text-zinc-400 hover:text-red-400 p-1"><TrashIcon className="h-4 w-4" /></button>
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
