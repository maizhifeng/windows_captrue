

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Studio from './components/Studio.tsx';
import { StudioProvider } from './components/contexts/StudioContext.tsx';
import LiveAnalysis from './components/LiveAnalysis.tsx';
import ManageSamples from './components/ManageSamples.tsx';
import TrainModel from './components/TrainModel.tsx';
import Settings from './components/Settings.tsx';
import VisualQna from './components/VisualQna.tsx';
import { SpinnerIcon } from './components/icons/SpinnerIcon.tsx';
import { api, StoredTrainingSample } from './components/utils/api.tsx';
import BackendConnectionManager from './components/BackendConnectionManager.tsx';
import MainPanelHeader from './components/MainPanelHeader.tsx';

// 定义应用程序的可用模式
export type Mode = 'analysis' | 'dataset' | 'training' | 'vqa' | 'settings';

const App: React.FC = () => {
    // 当前选择的应用程序模式
    const [mode, setMode] = useState<Mode>('analysis');
    // 从后端加载的训练样本列表
    const [samples, setSamples] = useState<StoredTrainingSample[]>([]);
    // 已保存的自定义模型信息
    const [savedModelInfo, setSavedModelInfo] = useState<string | null>(null);
    // 用于显示加载状态的消息
    const [dataStatus, setDataStatus] = useState<string>('正在初始化...');
    // 控制全局加载状态
    const [isLoading, setIsLoading] = useState(true);
    // 用于显示全局错误消息
    const [error, setError] = useState<string | null>(null);
    // 标记是否存在自定义模型
    const [hasCustomModel, setHasCustomModel] = useState(false);

    // 后端服务器 URL，从 localStorage 读取
    const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('serverUrl') || '');
    // 后端是否准备就绪并可连接
    const [isBackendReady, setIsBackendReady] = useState(false);
    
    // 侧边栏和工作室面板的折叠状态
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isStudioCollapsed, setIsStudioCollapsed] = useState(false);

    /**
     * 检查与后端服务器的连接。
     */
    const checkConnection = useCallback(async () => {
        if (!serverUrl) {
            setIsBackendReady(false);
            setError("后端服务器 URL 未配置。请输入 URL 以进行连接。");
            setIsLoading(false);
            return;
        }
        setDataStatus('正在连接到后端...');
        setError(null);
        try {
            // 调用健康检查 API
            await api.healthCheck();
            setIsBackendReady(true);
        } catch (e) {
            setIsBackendReady(false);
            let errorMsg = `无法连接到位于 ${serverUrl} 的后端。请检查 URL 并确保服务器正在运行。`;
            // 针对 Gradio 链接的特定错误消息
            if (serverUrl.includes('.gradio.live') && e instanceof Error && e.message.includes('404')) {
                errorMsg = `连接到 Gradio 服务器失败。公共 Gradio 链接在 72 小时后会过期。请从您的 Colab 笔记本生成一个新的 URL，并在此处或在设置中输入。`;
            } else if (e instanceof Error) {
                errorMsg += ` (错误: ${e.message})`;
            }
            setError(errorMsg);
            console.error(e);
        }
    }, [serverUrl]);

    // 当 serverUrl 改变时，重新检查连接
    useEffect(() => {
        checkConnection();
    }, [checkConnection]);

    /**
     * 从后端服务器加载初始数据（样本和模型信息）。
     */
    const loadData = useCallback(async () => {
        if (!isBackendReady) return;

        setIsLoading(true);
        setDataStatus('正在从服务器加载数据集和模型信息...');
        try {
            const [storedSamples, modelInfo] = await Promise.all([
                api.getSamples(),
                api.getModelInfo().catch(() => ({ classNames: [] })) // 如果模型信息不存在，则优雅地处理
            ]);

            setSamples(storedSamples);

            // 检查是否存在自定义模型
            if (modelInfo.classNames && modelInfo.classNames.length > 0) {
                setHasCustomModel(true);
                setSavedModelInfo(`已从服务器加载 (${modelInfo.classNames.join(', ')})`);
            } else {
                setHasCustomModel(false);
                setSavedModelInfo('在服务器上未找到自定义模型。');
            }
            
            setDataStatus(`准备就绪。已加载 ${storedSamples.length} 个样本。`);
        } catch (e) {
            console.error('从服务器加载数据失败', e);
            setError('无法从服务器加载数据。请检查连接和服务器状态。');
            setDataStatus('加载数据时出错。');
        } finally {
            setIsLoading(false);
        }
    }, [isBackendReady]);

    // 当后端准备就绪时，加载数据
    useEffect(() => {
        loadData();
    }, [loadData]);


    /**
     * 根据当前模式渲染主内容区域。
     */
    const renderContent = () => {
        const backendRequiredModes: Mode[] = ['dataset', 'training', 'vqa'];
        // 如果当前模式需要后端但后端未准备好，则显示连接管理器
        if (backendRequiredModes.includes(mode) && !isBackendReady) {
            return <BackendConnectionManager 
                        serverUrl={serverUrl}
                        setServerUrl={setServerUrl}
                        initialError={error}
                    />;
        }

        // 如果正在加载数据，则显示加载指示器
        if (isLoading && mode !== 'settings' && isBackendReady) {
             return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 text-zinc-400">
                    <SpinnerIcon />
                    <p className="mt-4">{dataStatus}</p>
                </div>
            )
        }

        // 根据模式渲染对应的组件
        switch (mode) {
            case 'analysis':
                return <LiveAnalysis hasCustomModel={hasCustomModel} />;
            case 'dataset':
                return <ManageSamples 
                            samples={samples}
                            setSamples={setSamples}
                        />;
            case 'training':
                return <TrainModel
                            savedModelInfo={savedModelInfo}
                            samples={samples}
                        />;
            case 'vqa':
                return <VisualQna />;
            case 'settings':
                return <Settings 
                            serverUrl={serverUrl} 
                            setServerUrl={setServerUrl}
                            isBackendReady={isBackendReady}
                            checkConnection={checkConnection}
                        />;
            default:
                return null;
        }
    };

    return (
        <StudioProvider>
            <div className="h-screen font-sans antialiased flex text-zinc-300 bg-zinc-950 p-3 gap-3">
                <Sidebar 
                    isCollapsed={isSidebarCollapsed} 
                    onToggle={() => setIsSidebarCollapsed(p => !p)} 
                    mode={mode} 
                    setMode={setMode} 
                />
                <main className="flex-1 flex flex-col min-w-0 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <MainPanelHeader mode={mode} />
                    <div className="flex-grow p-6 relative overflow-y-auto">
                        {/* 如果后端已连接但仍有错误，显示一个非阻塞的错误提示 */}
                        {isBackendReady && error && mode !== 'settings' && (
                            <div className="bg-amber-900/50 border border-amber-700 text-amber-300 p-4 rounded-lg mb-4 flex flex-col sm:flex-row justify-between items-center gap-4" role="alert">
                                <span>{error}</span>
                            </div>
                        )}
                        {renderContent()}
                    </div>
                </main>
                <Studio 
                    isCollapsed={isStudioCollapsed} 
                    onToggle={() => setIsStudioCollapsed(p => !p)} 
                />
            </div>
        </StudioProvider>
    );
};

export default App;