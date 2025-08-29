import React, { useState, useEffect, useRef } from 'react';
import { StoredTrainingSample, api } from './utils/api.tsx';
import SavedModelView from './training/SavedModelView.tsx';
import TrainingControls from './training/TrainingControls.tsx';
import { useStudio } from './contexts/StudioContext.tsx';

interface TrainModelProps {
    savedModelInfo: string | null; samples: StoredTrainingSample[];
}

/**
 * 模型训练页面组件。
 * 用户可以在此页面启动后端服务器上的模型训练过程。
 */
const TrainModel: React.FC<TrainModelProps> = ({ savedModelInfo, samples }) => {
    const [status, setStatus] = useState<string>(`准备训练。`);
    const [trainingProgress, setTrainingProgress] = useState({ epoch: 0, loss: 'N/A', accuracy: 'N/A' });
    const [isTraining, setIsTraining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollingInterval = useRef<number | null>(null); // 用于轮询训练状态的 interval ID

    const { setStudioContent } = useStudio();
    // 此页面不使用工作室面板，所以在进入时清除它
    useEffect(() => {
        setStudioContent(null);
        return () => setStudioContent(null);
    }, [setStudioContent]);

    /**
     * 轮询后端以获取最新的训练状态。
     */
    const pollStatus = async () => {
        try {
            const result = await api.getTrainingStatus();
            setStatus(result.status);
            if (result.progress) {
                 setTrainingProgress({
                    epoch: result.progress.epoch,
                    loss: result.progress.loss.toFixed(4),
                    accuracy: result.progress.accuracy.toFixed(4),
                });
            }

            // 当训练结束（成功、失败或空闲）时，停止轮询
            if (result.status === 'completed' || result.status === 'failed' || result.status === 'idle') {
                if (pollingInterval.current) clearInterval(pollingInterval.current);
                setIsTraining(false);
                 if(result.status === 'completed') {
                    // 提醒用户重新加载以使用新模型
                    setError('训练完成！新模型现在在服务器上处于活动状态。重新加载页面以确保所有组件都使用新模型。');
                }
                 if(result.status === 'failed') {
                    setError('训练失败。请检查服务器日志以获取详细信息。');
                }
            }
        } catch (e) {
            console.error('轮询错误', e);
            setError('无法从服务器获取训练状态。');
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            setIsTraining(false);
        }
    };
    
    // 组件卸载时清除轮询定时器
    useEffect(() => {
        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        }
    }, []);

    /**
     * 开始训练过程。
     */
    const startTraining = async () => {
        const uniqueLabels = [...new Set(samples.flatMap(s => s.boxes.map(b => b.label)))];
        // 训练前的验证检查
        if (samples.length === 0) {
            setError("无法在空数据集上进行训练。请先添加并标注一些样本。"); return;
        }
        if (uniqueLabels.length < 2) {
            setError("训练需要至少两种不同的标签（例如，'player' 和 'enemy'）。请为另一个类别添加并标注样本。"); return;
        }

        setIsTraining(true);
        setStatus("正在同步本地样本到服务器...");
        setTrainingProgress({ epoch: 0, loss: '0.00', accuracy: '0.00' }); 
        setError(null);

        try {
            // 同步样本到后端
            await api.clearSamples();
            for (const sample of samples) {
                const response = await fetch(sample.imageUrl);
                const imageDataBlob = await response.blob();
                await api.uploadSample(imageDataBlob, sample.boxes);
            }
            setStatus(`同步了 ${samples.length} 个样本。正在开始训练...`);

            // 调用 API 启动训练
            await api.startTraining();
            setStatus("训练已在服务器上开始。正在等待进度...");
            // 开始轮询状态
            if (pollingInterval.current) clearInterval(pollingInterval.current);
            pollingInterval.current = window.setInterval(pollStatus, 2000);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "发生未知错误。";
            setError(`训练错误：${errorMessage}`);
            setStatus("训练启动失败。");
            setIsTraining(false);
        }
    };
    
    return (
        <div className="max-w-2xl mx-auto h-full flex flex-col justify-center">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">训练工作室</h2>
                <p className="mt-2 max-w-xl mx-auto text-zinc-600 dark:text-zinc-400">使用您收集的数据集训练一个自定义对象检测模型。此过程在您配置的后端服务器上运行。</p>
            </div>
            <div className="space-y-6">
                <SavedModelView savedModelInfo={savedModelInfo} />
                <TrainingControls 
                    status={status} isTraining={isTraining} trainingProgress={trainingProgress}
                    onStartTraining={startTraining} canTrain={samples.length > 0}
                    sampleCount={samples.length}
                />
                {error && <p className="text-amber-700 dark:text-amber-400 text-sm mt-4 text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 p-3 rounded-lg">{error}</p>}
            </div>
        </div>
    );
};

export default TrainModel;
