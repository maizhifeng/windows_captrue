import { StoredTrainingSample } from "./db.tsx";

export const createDetectionModel = (trainedModel: any, classNames: string[]) => {
    return {
        detect: async (video: HTMLVideoElement): Promise<{ class: string; score: number; bbox: [number, number, number, number] }[]> => {
            // Asynchronous operations require manual tensor management instead of tf.tidy()
            const videoTensor = tf.browser.fromPixels(video);
            const [height, width] = trainedModel.inputs[0].shape.slice(1, 3);
            
            const resized = tf.image.resizeBilinear(videoTensor, [height, width]);
            const batched = resized.expandDims(0);
            const normalized = batched.toFloat().div(tf.scalar(255));
    
            const [classProbs, boxCoords] = trainedModel.predict(normalized);

            const scoreTensor = classProbs.max();
            const classIndexTensor = classProbs.argMax();

            // Asynchronously download data from GPU
            const [scoreData, classIndexData, boxData] = await Promise.all([
                scoreTensor.data(),
                classIndexTensor.data(),
                boxCoords.data()
            ]);

            const score = scoreData[0];
            const classIndex = classIndexData[0];
            
            // Clean up all intermediate tensors
            tf.dispose([
                videoTensor, resized, batched, normalized, 
                classProbs, boxCoords, scoreTensor, classIndexTensor
            ]);
        
            const [rawY1, rawX1, rawY2, rawX2] = [boxData[0], boxData[1], boxData[2], boxData[3]];
            
            const y1 = Math.min(rawY1, rawY2);
            const x1 = Math.min(rawX1, rawX2);
            const y2 = Math.max(rawY1, rawY2);
            const x2 = Math.max(rawX1, rawX2);

            const bbox: [number, number, number, number] = [
                x1 * video.videoWidth,
                y1 * video.videoHeight,
                (x2 - x1) * video.videoWidth,
                (y2 - y1) * video.videoHeight,
            ];

            return [{
                class: classNames[classIndex],
                score: score,
                bbox: bbox
            }];
        },
        classNames: classNames,
        inputs: trainedModel.inputs,
    };
};

export const startTrainingProcess = async (
    samples: StoredTrainingSample[], 
    setStatus: (status: string) => void,
    setTrainingProgress: (progress: {epoch: number, loss: string, accuracy: string}) => void
) => {
    const uniqueLabels = [...new Set(samples.flatMap(s => s.boxes.map(b => b.label)))];
    
    setStatus("Loading base model...");
    const mobilenet = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json');
    
    setStatus("Preparing data...");
    const images: any[] = [];
    const targets: { class: any, box: any }[] = [];
    const INPUT_SIZE = 224;

    const tensorsToDispose: any[] = [];
    
    for (const sample of samples) {
        const imageTensor = tf.browser.fromPixels(sample.imageData);
        tensorsToDispose.push(imageTensor);
        const resized = tf.image.resizeBilinear(imageTensor, [INPUT_SIZE, INPUT_SIZE]);
        tensorsToDispose.push(resized);

        for (const boxData of sample.boxes) {
            const normalizedImage = resized.toFloat().div(tf.scalar(255));
            images.push(normalizedImage);

            const labelIndex = uniqueLabels.indexOf(boxData.label);
            const classTarget = tf.oneHot(tf.tensor1d([labelIndex], 'int32'), uniqueLabels.length);
            const boxTarget = tf.tensor2d([boxData.box], [1, 4]);
            targets.push({ 'class': classTarget, 'box': boxTarget });
        }
    }
    
    const imageTensors = tf.stack(images);
    const classTargets = tf.concat(targets.map(t => t['class']));
    const boxTargets = tf.concat(targets.map(t => t['box']));

    tf.dispose(tensorsToDispose);
    tf.dispose(images);
    targets.forEach(t => {
        t.class.dispose();
        t.box.dispose();
    });

    
    let layer = mobilenet.layers[mobilenet.layers.length - 7];
    
    const truncatedMobilenet = tf.model({
        inputs: mobilenet.inputs,
        outputs: layer.output,
    });

    for (const l of truncatedMobilenet.layers) {
        l.trainable = false;
    }

    const newHead = tf.sequential({
        layers: [
            tf.layers.flatten({inputShape: truncatedMobilenet.outputs[0].shape.slice(1)}),
            tf.layers.dense({units: 128, activation: 'relu'}),
            tf.layers.dense({units: 64, activation: 'relu'}),
        ]
    });
    
    const inputs = tf.input({shape: [INPUT_SIZE, INPUT_SIZE, 3]});
    const features = truncatedMobilenet.apply(inputs);
    const headOutputs = newHead.apply(features);
    
    const classOutput = tf.layers.dense({ units: uniqueLabels.length, activation: 'softmax', name: 'class' }).apply(headOutputs);
    const boxOutput = tf.layers.dense({ units: 4, activation: 'sigmoid', name: 'box' }).apply(headOutputs);

    const model = tf.model({
        inputs,
        outputs: [ classOutput, boxOutput ]
    });
    
    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: {'class': 'categoricalCrossentropy', 'box': 'meanSquaredError'},
        metrics: ['accuracy']
    });

    setStatus("Training model...");
    await model.fit(imageTensors, {'class': classTargets, 'box': boxTargets}, {
        epochs: 20,
        batchSize: 5,
        callbacks: {
            onEpochEnd: (epoch: number, logs: any) => {
                const loss = logs?.loss ?? 0;
                // The 'accuracy' metric is applied to the 'class' output, so the key is 'class_accuracy'.
                const accuracy = logs?.class_accuracy ?? 0;

                setTrainingProgress({ 
                    epoch: epoch + 1, 
                    loss: loss.toFixed(4), 
                    accuracy: accuracy.toFixed(4) 
                });
                setStatus(`Epoch ${epoch+1} complete. Loss: ${loss.toFixed(4)}`);
            }
        }
    });

    return model;
};
