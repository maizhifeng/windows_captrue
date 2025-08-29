
import React, { createContext, useContext, useState, useMemo } from 'react';

// 定义 Studio 上下文的类型
export interface StudioContextType {
  studioContent: React.ReactNode; // 面板中要渲染的内容
  setStudioContent: (content: React.ReactNode) => void; // 更新内容的函数
  studioSummaryContent: React.ReactNode; // 折叠时显示的内容
  setStudioSummaryContent: (content: React.ReactNode) => void; // 更新折叠内容的函数
  isStudioVisible: boolean; // 面板是否应该可见
}

const StudioContext = createContext<StudioContextType | null>(null);

/**
 * StudioProvider 组件。
 * 它为应用程序的子组件提供 Studio 上下文。
 * 这允许任何子组件控制右侧“工作室”面板的内容和可见性。
 */
export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [studioContent, setStudioContent] = useState<React.ReactNode>(null);
    const [studioSummaryContent, setStudioSummaryContent] = useState<React.ReactNode>(null);
    
    // 使用 useMemo 来记忆化上下文的值，以防止不必要的重渲染
    const contextValue = useMemo(() => ({
        studioContent,
        setStudioContent,
        studioSummaryContent,
        setStudioSummaryContent,
        // 如果有内容，则面板可见
        isStudioVisible: studioContent !== null
    }), [studioContent, studioSummaryContent]);

    return (
        <StudioContext.Provider value={contextValue}>
            {children}
        </StudioContext.Provider>
    );
};

/**
 * 自定义 Hook `useStudio`，用于方便地访问 Studio 上下文。
 * @returns Studio 上下文对象。
 * @throws 如果在 StudioProvider 外部使用，则抛出错误。
 */
export const useStudio = () => {
    const context = useContext(StudioContext);
    if (!context) {
        throw new Error('useStudio 必须在 StudioProvider 内部使用');
    }
    return context;
};
