/**
 * This file provides minimal type definitions for TensorFlow.js and the COCO-SSD model,
 * which are loaded via CDN scripts in index.html. This helps TypeScript understand
 * the global `tf` and `cocoSsd` variables without needing to install the full
 * type packages, which can be large and complex.
 *
 * 这为通过 index.html 中的 CDN 脚本加载的 TensorFlow.js 和 COCO-SSD 模型提供了最小的类型定义。
 * 这有助于 TypeScript 理解全局的 `tf` 和 `cocoSsd` 变量，而无需安装完整
 * 的类型包，因为它们可能很大且复杂。
 */

declare var tf: any;
declare var cocoSsd: any;
