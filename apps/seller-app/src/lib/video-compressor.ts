import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Load FFmpeg.wasm instance (singleton)
 */
async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    isLoading = true;
    const ffmpeg = new FFmpeg();

    // Load FFmpeg core
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    isLoading = false;
    return ffmpeg;
  })();

  return loadPromise;
}

export interface CompressionOptions {
  maxSizeMB?: number;
  maxResolution?: number;
  bitrate?: string;
  crf?: number; // Quality: 23 (default), lower = better quality
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
  onProgress?: (progress: number) => void;
}

/**
 * Compress video using FFmpeg.wasm
 */
export async function compressVideo(
  file: File,
  options?: CompressionOptions
): Promise<File> {
  const {
    maxResolution = 1280,
    bitrate = '800k',
    crf = 28, // Higher CRF = more compression
    preset = 'fast',
    onProgress,
  } = options || {};

  try {
    // Load FFmpeg
    const ffmpeg = await loadFFmpeg();

    // Set up progress callback
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }

    // Write input file
    const inputName = 'input' + getFileExtension(file.name);
    const outputName = 'output.mp4';
    
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Compression command
    // -i: input file
    // -vf scale: resize video (maintain aspect ratio)
    // -c:v libx264: use H.264 codec
    // -crf: quality (23 = default, 28 = more compression)
    // -preset: encoding speed
    // -b:v: target bitrate
    // -c:a aac: audio codec
    // -b:a: audio bitrate
    // -movflags +faststart: optimize for web streaming
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `scale='min(${maxResolution},iw)':'min(${maxResolution},ih)':force_original_aspect_ratio=decrease`,
      '-c:v', 'libx264',
      '-crf', crf.toString(),
      '-preset', preset,
      '-b:v', bitrate,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', // Overwrite output
      outputName
    ]);

    // Read output file
    // Read output file
    const data = await ffmpeg.readFile(outputName);
    
    // Clean up
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    // Create compressed file - convert to proper Uint8Array
    const uint8Data = typeof data === 'string' 
      ? new TextEncoder().encode(data) 
      : new Uint8Array(data);
    const blob = new Blob([uint8Data], { type: 'video/mp4' });
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, '.mp4'),
  {
    type: 'video/mp4',
  }
);

return compressedFile;

  } catch (error) {
    console.error('FFmpeg compression error:', error);
    throw new Error(
      error instanceof Error 
        ? `Compression failed: ${error.message}` 
        : 'Compression failed'
    );
  }
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : '.mp4';
}

/**
 * Check if FFmpeg is supported in current browser
 */
export function isFFmpegSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Estimate compressed size (rough approximation)
 */
export function estimateCompressedSize(
  originalSize: number,
  bitrate: string = '800k'
): number {
  // Very rough estimation based on bitrate
  const bitrateNum = parseInt(bitrate) * 1000; // Convert to bps
  const estimatedSize = bitrateNum * 60 / 8; // Assume 60 seconds average
  return Math.min(estimatedSize, originalSize * 0.3); // Max 30% of original
}
