import React from 'react';

interface DetectionResultsProps {
    objectCounts: Map<string, number>;
    totalDetections: number;
    realtimeFps: number;
}

/**
 * 显示实时分析指标和检测到的对象列表的组件。
 */
const DetectionResults: React.FC<DetectionResultsProps> = ({ objectCounts, totalDetections, realtimeFps }) => {
    return (
        <div className="flex-grow flex flex-col min-h-0">
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-3">实时指标</h3>
            {/* 指标网格 */}
            <div className="grid grid-cols-2 gap-3">
                <div className="text-center bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">分析帧率</span>
                    <span className="font-bold text-2xl text-green-600 dark:text-green-400" title="Frames Per Second">{realtimeFps.toFixed(1)}</span>
                </div>
                <div className="text-center bg-zinc-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400 block text-xs">总对象数</span>
                    <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">{totalDetections}</span>
                </div>
            </div>

            <div className="col-span-2 h-px bg-zinc-200 dark:bg-zinc-700 my-4"></div>
            
            {/* 检测到的类别列表 */}
            <div className="flex-grow space-y-2 overflow-y-auto pr-2 -mr-2">
                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">检测到的类别</h4>
                {objectCounts.size > 0 ? (
                    // 按数量降序排序
                    Array.from(objectCounts.entries()).sort((a,b) => b[1] - a[1]).map(([className, count]) => (
                        <div key={className} className="flex justify-between bg-zinc-100/80 dark:bg-zinc-800/60 p-2 rounded-md text-sm">
                            <span className="capitalize text-zinc-700 dark:text-zinc-300">{className}</span>
                            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">{count}</span>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-24 text-zinc-500 dark:text-zinc-400 text-sm">
                        <p>正在搜索对象...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetectionResults;