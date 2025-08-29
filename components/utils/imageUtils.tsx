
/**
 * 将 ImageData 对象转换为 Blob 对象。
 * @param imageData - 来自 canvas 的 ImageData。
 * @returns 一个 Promise，解析为 PNG 格式的 Blob 或 null。
 */
export const imageDataToBlob = (imageData: ImageData): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    ctx.putImageData(imageData, 0, 0);
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/png'));
};
