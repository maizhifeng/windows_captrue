
import { Client } from '@gradio/client';

// 定义与后端交互的数据结构

// 标注框数据
export interface BoxData {
    label: string;
    box: [number, number, number, number]; // [y1, x1, y2, x2] 归一化坐标
}

// 存储在后端的训练样本
export interface StoredTrainingSample {
    id: number;
    imageUrl: string; // 样本图像的 URL
    boxes: BoxData[];
}

// 检测结果
export interface Detection {
    class: string;
    score: number;
    box: { x1: number; y1: number; x2: number; y2: number; }; // 归一化坐标
}

/**
 * 从 localStorage 获取基础服务器 URL。
 * @returns 服务器 URL。
 * @throws 如果 URL 未配置，则抛出错误。
 */
const getBaseUrl = (): string => {
    const url = localStorage.getItem('serverUrl');
    if (!url) throw new Error("服务器 URL 未配置。请在设置页面中设置。");
    return url.replace(/\/$/, ''); // 移除末尾的斜杠
};

/**
 * 统一处理 fetch 响应。
 * @param response - fetch API 的 Response 对象。
 * @returns 解析后的 JSON 数据。
 * @throws 如果响应状态码不是 2xx，则抛出错误。
 */
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = `HTTP 错误！状态码: ${response.status}`;
        try {
            // 尝试解析 JSON 格式的错误体
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorMessage;
        } catch (e) {
            // 如果错误体不是 JSON，则读取为文本
            const errorBodyText = await response.text();
            errorMessage = `${errorMessage}. 响应体: ${errorBodyText}`;
        }
        throw new Error(errorMessage);
    }
    return response.json();
};

/**
 * 将样本中可能存在的相对 imageUrl 解析为绝对 URL。
 * @param sample - 包含 imageUrl 的样本对象。
 * @param baseUrl - 服务器的基础 URL。
 * @returns 带有绝对 imageUrl 的新样本对象。
 */
const resolveSampleImageUrl = (sample: StoredTrainingSample, baseUrl: string): StoredTrainingSample => {
    if (typeof sample.imageUrl !== 'string' || sample.imageUrl === '') {
        return sample;
    }
    try {
        // new URL() 可以正确处理绝对和相对 URL
        const absoluteImageUrl = new URL(sample.imageUrl, baseUrl).href;
        return { ...sample, imageUrl: absoluteImageUrl };
    } catch (e) {
        console.error(`发现无效的 imageUrl，无法解析: ${sample.imageUrl}`, e);
        return sample; // 如果 URL 创建失败，则返回原始样本
    }
};

/**
 * 与后端 API 交互的函数集合。
 */
export const api = {
    /**
     * 健康检查，用于测试服务器连接。
     * @param urlToTest - (可选) 要测试的特定 URL。
     */
    healthCheck: async (urlToTest?: string) => {
        const baseUrl = urlToTest ? urlToTest.replace(/\/$/, '') : getBaseUrl();
        const response = await fetch(`${baseUrl}/api/health`);
        return handleResponse(response);
    },

    /**
     * 获取所有训练样本。
     */
    getSamples: async (): Promise<StoredTrainingSample[]> => {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/samples`);
        const samples: StoredTrainingSample[] = await handleResponse(response);
        // 确保所有样本的图片 URL 都是绝对路径
        return samples.map(sample => resolveSampleImageUrl(sample, baseUrl));
    },

    /**
     * 获取当前部署在服务器上的自定义模型的信息。
     */
    getModelInfo: async (): Promise<{ classNames: string[] }> => {
        const response = await fetch(`${getBaseUrl()}/api/model/info`);
        return handleResponse(response);
    },
    
    /**
     * 上传一个新的训练样本（图像和标注框）。
     */
    uploadSample: async (imageData: Blob, boxes: BoxData[]): Promise<StoredTrainingSample> => {
        const baseUrl = getBaseUrl();
        const formData = new FormData();
        formData.append('image', imageData);
        formData.append('boxes', JSON.stringify(boxes));
        
        const response = await fetch(`${baseUrl}/api/samples`, {
            method: 'POST',
            body: formData,
        });
        const newSample: StoredTrainingSample = await handleResponse(response);
        return resolveSampleImageUrl(newSample, baseUrl);
    },

    /**
     * 更新现有样本的标注框。
     */
    updateSample: async (id: number, boxes: BoxData[]): Promise<StoredTrainingSample> => {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/samples/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ boxes }),
        });
        const updatedSample: StoredTrainingSample = await handleResponse(response);
        return resolveSampleImageUrl(updatedSample, baseUrl);
    },

    /**
     * 删除一个指定的样本。
     */
    deleteSample: async (id: number): Promise<{ message: string }> => {
        const response = await fetch(`${getBaseUrl()}/api/samples/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },

    /**
     * 清除所有样本。
     */
    clearSamples: async (): Promise<{ message: string }> => {
        const response = await fetch(`${getBaseUrl()}/api/samples`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },

    /**
     * 发送一帧图像到后端进行分析。
     * @param base64Image - Base64 编码的图像数据。
     * @param model - 使用 'coco'（通用）或 'custom'（自定义）模型。
     */
    analyzeFrame: async (base64Image: string, model: 'coco' | 'custom'): Promise<Detection[]> => {
        const response = await fetch(`${getBaseUrl()}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image, model: model }),
        });
        return handleResponse(response);
    },
    
    /**
     * 启动后端的模型训练过程。
     */
    startTraining: async (): Promise<{ message: string, trainingId: string }> => {
        const response = await fetch(`${getBaseUrl()}/api/train`, { method: 'POST' });
        return handleResponse(response);
    },

    /**
     * 获取当前的训练状态和进度。
     */
    getTrainingStatus: async (): Promise<{ status: string; progress?: { epoch: number; loss: number; accuracy: number } }> => {
        const response = await fetch(`${getBaseUrl()}/api/train/status`);
        return handleResponse(response);
    },

    /**
     * 向视觉问答（VQA）模型提问。
     * 此函数使用 @gradio/client 与 Gradio 后端进行交互。
     * @param base64Image - Base64 编码的图像。
     * @param question - 关于图像的问题。
     * @returns AI 模型的回答字符串。
     */
    askVisualQuestion: async (base64Image: string, question: string): Promise<string> => {
        const baseUrl = getBaseUrl();
        const imageBlob = await (await fetch(base64Image)).blob();
        
        type GradioPrediction = { data: any[]; };
        
        try {
            const client = await Client.connect(baseUrl);
            const result: GradioPrediction = await client.predict('/predict', {
                image: imageBlob,
                question: question,
            });

            // 解析 Gradio 的特定响应格式
            if (result && Array.isArray(result.data) && result.data.length > 0 && typeof result.data[0] === 'string') {
                return result.data[0];
            } else {
                console.error("来自 Gradio Client 的意外 API 响应格式:", result);
                throw new Error("来自 Gradio 服务器的意外响应格式。期望得到一个字符串输出。");
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '发生未知错误。';
            throw new Error(`与 AI 模型通信失败：${errorMessage}`);
        }
    },
};
