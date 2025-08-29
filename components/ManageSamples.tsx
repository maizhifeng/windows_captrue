import React, { useState, useEffect, useCallback } from 'react';
import { StoredTrainingSample, BoxData } from './utils/api.tsx';
import { db } from './utils/db.tsx';
import { imageDataToBlob } from './utils/imageUtils.tsx';
import AnnotationView from './training/AnnotationView.tsx';
import SamplesView from './training/SamplesView.tsx';
import SampleEditorModal from './training/SampleEditorModal.tsx';
import { useStudio } from './contexts/StudioContext.tsx';
import { useGoogleAuth } from './contexts/GoogleAuthContext.tsx';
import { type Mode } from '../App.tsx';

declare var JSZip: any;

// 定义用于编辑的会话对象接口
interface AnnotationSession {
    id?: number;
    imageData: ImageData;
    imageUrl?: string;
    boxes: BoxData[];
}

interface ManageSamplesProps {
    samples: StoredTrainingSample[];
    setSamples: React.Dispatch<React.SetStateAction<StoredTrainingSample[]>>;
    setMode: (mode: Mode) => void;
}

/**
 * 数据集管理页面，整合了数据收集（AnnotationView）和样本展示（SamplesView）功能。
 */
const ManageSamples: React.FC<ManageSamplesProps> = ({ samples, setSamples, setMode }) => {
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [editingSession, setEditingSession] = useState<AnnotationSession | null>(null); // 当前正在编辑的样本会话
    const { setStudioContent, setStudioSummaryContent } = useStudio();
    const { isSignedIn, authStatus, signIn, signOut, getAccessToken, authError } = useGoogleAuth();
    const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
    
    /**
     * 处理从 SampleEditorModal 保存样本的逻辑。
     * 这可以是更新现有样本或创建新样本。
     */
    const handleSaveSample = useCallback(async (session: AnnotationSession) => {
        if (!session || session.boxes.length === 0) {
            setError("请在保存前至少添加一个标注框。");
            return;
        }
        setError(null);
        setStatus('正在将样本保存到本地数据库...');
        const { imageData, boxes, id } = session;

        try {
            const imageDataBlob = await imageDataToBlob(imageData);
            if (!imageDataBlob) {
                 setError("无法处理图像以进行保存。");
                 setStatus('处理图像时出错。');
                 return;
            }

            if (id !== undefined) {
                // 更新现有样本
                await db.updateSample(id, { imageDataBlob, boxes });
                setSamples(samples.map(s => s.id === id ? { ...s, boxes: boxes } : s));
                setStatus(`样本 ${id} 已更新。`);
            } else {
                // 创建新样本
                const newId = await db.addSample({ imageDataBlob, boxes });
                const newSample: StoredTrainingSample = {
                    id: newId,
                    imageUrl: URL.createObjectURL(imageDataBlob),
                    boxes,
                };
                setSamples(prev => [...prev, newSample]);
                setStatus(`新样本 #${newSample.id} 已保存。`);
            }
           
            setEditingSession(null); // 关闭编辑器模态框
        } catch (e) {
            console.error("保存样本失败", e);
            const errorMessage = e instanceof Error ? e.message : "发生未知错误。";
            setError(`无法保存样本：${errorMessage}`);
        }
    }, [samples, setSamples]);

    /**
     * 当 AnnotationView 捕获一个新帧时，用该帧的数据打开编辑器。
     */
    const handleFrameCaptured = useCallback((imageData: ImageData) => {
        setEditingSession({ imageData, boxes: [] });
    }, []);

    /**
     * 当 AnnotationView 自动捕获一个帧时，直接将其作为未标注样本保存。
     */
    const handleAutoCapturedFrame = useCallback(async (imageData: ImageData) => {
        const imageDataBlob = await imageDataToBlob(imageData);
        if (imageDataBlob) {
            try {
                // 上传时不带任何标注框
                const newId = await db.addSample({ imageDataBlob, boxes: [] });
                const newSample: StoredTrainingSample = {
                    id: newId,
                    imageUrl: URL.createObjectURL(imageDataBlob),
                    boxes: [],
                };
                setSamples(s => [...s, newSample]);
                setStatus(`已自动捕获帧 ${newSample.id}。总数: ${samples.length + 1}`);
            } catch (e) {
                console.error("保存自动捕获的帧失败", e);
                setError("无法保存自动捕获的帧。");
            }
        }
    }, [samples.length, setSamples]);
    
    /**
     * 处理删除单个样本的逻辑。
     */
    const handleDeleteSample = useCallback(async (idToDelete: number) => {
        if (editingSession?.id === idToDelete) setEditingSession(null); // 如果正在编辑的样本被删除，关闭编辑器

        const sampleToDelete = samples.find(s => s.id === idToDelete);

        await db.deleteSample(idToDelete);
        setSamples(s => s.filter((sample) => sample.id !== idToDelete));
        
        if (sampleToDelete) {
            URL.revokeObjectURL(sampleToDelete.imageUrl);
        }
    }, [editingSession?.id, setSamples, samples]);

    /**
     * 处理清除所有样本的逻辑。
     */
    const handleClearAllSamples = useCallback(async () => {
        if (window.confirm('您确定要从本地数据库删除所有收集的样本吗？此操作无法撤销。')) {
            await db.clearSamples();
            samples.forEach(s => URL.revokeObjectURL(s.imageUrl));
            setSamples([]);
            setEditingSession(null);
        }
    }, [setSamples, samples]);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    /**
     * 将所有样本打包成一个 zip 文件并下载。
     */
    const handleExportSamples = useCallback(async () => {
        if (samples.length === 0) return;
        setStatus('正在打包样本...');
        setError(null);
        try {
            const zip = new JSZip();
            const imagesFolder = zip.folder("images");
            const annotationsData = [];

            for (const sample of samples) {
                const response = await fetch(sample.imageUrl);
                const blob = await response.blob();
                const filename = `sample_${sample.id}.png`;
                imagesFolder.file(filename, blob);
                annotationsData.push({ image: filename, boxes: sample.boxes });
            }

            zip.file("annotations.json", JSON.stringify(annotationsData, null, 2));
            const zipBlob = await zip.generateAsync({ type: "blob" });
            downloadBlob(zipBlob, 'ai-vision-dataset.zip');
            setStatus(`已导出 ${samples.length} 个样本。`);
    
        } catch (e) {
            setError("导出过程中发生错误。");
            console.error(e);
        }
    }, [samples]);

     /**
     * 将样本导出到 Google Drive。
     */
    const handleExportToDrive = useCallback(async () => {
        if (samples.length === 0) {
            setError("没有要导出的样本。");
            return;
        }
        if (!isSignedIn) {
            setError("请在导出前登录 Google。");
            return;
        }

        setIsUploadingToDrive(true);
        setStatus(`正在打包 ${samples.length} 个样本以上传...`);
        setError(null);

        try {
            const zip = new JSZip();
            const imagesFolder = zip.folder("images");
            const annotationsData = [];
            for (const sample of samples) {
                const response = await fetch(sample.imageUrl);
                const blob = await response.blob();
                const filename = `sample_${sample.id}.png`;
                imagesFolder.file(filename, blob);
                annotationsData.push({ image: filename, boxes: sample.boxes });
            }
            zip.file("annotations.json", JSON.stringify(annotationsData, null, 2));
            const zipBlob = await zip.generateAsync({ type: "blob" });

            setStatus('正在上传到 Google Drive...');
            
            const accessToken = getAccessToken();
            if (!accessToken) throw new Error("Google 身份验证令牌无效。");

            const metadata = {
                name: 'ai-vision-dataset.zip',
                mimeType: 'application/zip',
            };
            
            const formData = new FormData();
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', zipBlob);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`Google Drive 上传失败: ${errorBody.error.message}`);
            }

            setStatus('成功上传到 Google Drive！');
        } catch (e) {
            const message = e instanceof Error ? e.message : "发生未知错误";
            setError(`导出到 Google Drive 失败: ${message}`);
            setStatus('导出失败。');
            console.error(e);
        } finally {
            setIsUploadingToDrive(false);
        }
    }, [samples, getAccessToken, isSignedIn]);
    
    /**
     * 当用户点击一个样本缩略图时，加载完整的图像数据并打开编辑器。
     */
    const openEditorForSample = useCallback(async (sample: StoredTrainingSample) => {
        setStatus(`正在为样本 ${sample.id} 加载图像...`);
        try {
            const response = await fetch(sample.imageUrl);
            const blob = await response.blob();
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("无法创建画布上下文");
            ctx.drawImage(bitmap, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            setEditingSession({ ...sample, imageData });
            setStatus('');
        } catch (e) {
            console.error("加载图像进行编辑失败", e);
            setError(`加载样本 #${sample.id} 的图像失败。`);
        }
    }, []);

    // 使用右侧的工作室面板来显示样本列表和摘要
    useEffect(() => {
        setStudioContent(
            <SamplesView 
                samples={samples}
                onDeleteSample={handleDeleteSample}
                onClearAllSamples={handleClearAllSamples}
                onSelectSample={openEditorForSample}
                onExportSamples={handleExportSamples}
                onExportToDrive={handleExportToDrive}
                authStatus={authStatus}
                isGoogleSignedIn={isSignedIn}
                isUploadingToDrive={isUploadingToDrive}
                selectedSampleId={editingSession?.id}
                onSignIn={signIn}
                onSignOut={signOut}
                authError={authError}
            />
        );
        
        setStudioSummaryContent(
            <div className="flex flex-col items-center justify-center h-full p-2 text-center">
                <div>
                    <span className="font-bold text-2xl text-purple-600 dark:text-purple-400">{samples.length}</span>
                    <span className="font-medium text-zinc-500 dark:text-zinc-400 block text-xs mt-1">样本</span>
                </div>
            </div>
        );

        return () => {
            setStudioContent(null);
            setStudioSummaryContent(null);
        };
    }, [setStudioContent, setStudioSummaryContent, samples, editingSession?.id, handleDeleteSample, handleClearAllSamples, openEditorForSample, handleExportSamples, handleExportToDrive, authStatus, isSignedIn, isUploadingToDrive, signIn, signOut, setMode, authError]);

    // 在编辑器中导航到上一个或下一个样本
    const currentSampleIndex = editingSession?.id !== undefined ? samples.findIndex(s => s.id === editingSession.id) : -1;
    const handleNavigate = (direction: 'prev' | 'next') => {
        if (currentSampleIndex === -1) return;
        const nextIndex = direction === 'prev' ? currentSampleIndex - 1 : currentSampleIndex + 1;
        if (nextIndex >= 0 && nextIndex < samples.length) {
            openEditorForSample(samples[nextIndex]);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full">
                {status && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 text-center">{status}</p>}
                {error && <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">{error}</p>}
                <div className="flex-grow min-h-0">
                    {/* 数据收集组件 */}
                    <AnnotationView 
                        onFrameCaptured={handleFrameCaptured}
                        onAutoCapturedFrame={handleAutoCapturedFrame}
                    />
                </div>
            </div>

            {/* 样本编辑器模态框 */}
            {editingSession && (
                <SampleEditorModal 
                    session={editingSession}
                    onSave={handleSaveSample}
                    onClose={() => setEditingSession(null)}
                    onNavigate={handleNavigate}
                    canGoPrevious={currentSampleIndex > 0}
                    canGoNext={currentSampleIndex !== -1 && currentSampleIndex < samples.length - 1}
                />
            )}
        </>
    );
};

export default ManageSamples;