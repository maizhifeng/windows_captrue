

const DB_NAME = 'AI-Vision-Training-DB';
const STORE_NAME = 'training_samples';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => {
            dbPromise = null; // Allow retry on error
            reject("Error opening DB");
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
    return dbPromise;
};


export const db = {
    async getAllSamples() {
        const db = await openDB();
        return new Promise<any[]>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Failed to get samples');
        });
    },
    async getSample(id: number) {
        const db = await openDB();
        return new Promise<any>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject('Failed to get sample by ID');
        });
    },
    async addSample(sample: { imageDataBlob: Blob, boxes: any[] }) {
        const db = await openDB();
        return new Promise<number>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(sample);
            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject('Failed to add sample');
        });
    },
    async updateSample(id: number, sample: { imageDataBlob: Blob, boxes: any[] }) {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put({ ...sample, id });
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Failed to update sample');
        });
    },
    async deleteSample(id: number) {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Failed to delete sample');
        });
    },
    async clearSamples() {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Failed to clear samples');
        });
    }
};

export const imageDataToBlob = (imageData: ImageData): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return Promise.resolve(null);
    ctx.putImageData(imageData, 0, 0);
    return new Promise(resolve => canvas.toBlob(blob => resolve(blob)));
};

export const blobToImageData = async (blob: Blob): Promise<ImageData | null> => {
    try {
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
        console.error("Failed to convert blob to ImageData", e);
        return null;
    }
};

export interface BoxData {
    label: string;
    box: [number, number, number, number]; // [y1, x1, y2, x2] normalized
}

export interface TrainingSample {
    imageData: ImageData;
    boxes: BoxData[];
}

export interface StoredTrainingSample extends TrainingSample {
    id: number;
}

export interface AnnotationSession {
    id?: number;
    imageData: ImageData;
    boxes: BoxData[];
}
