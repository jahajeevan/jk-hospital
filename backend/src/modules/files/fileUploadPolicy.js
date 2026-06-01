const allowedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export const validateUploadMetadata = ({ mimeType, size }) => {
  if (!allowedMimeTypes.has(mimeType)) {
    const error = new Error('Unsupported file type');
    error.statusCode = 415;
    throw error;
  }

  const maxSize = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
  if (Number(size) > maxSize) {
    const error = new Error('File is too large');
    error.statusCode = 413;
    throw error;
  }

  return true;
};

export const fileStorageArchitecture = {
  provider: process.env.FILE_STORAGE_PROVIDER || 'cloudinary',
  signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 300),
  antivirusQueue: 'file-scan',
  cleanupQueue: 'file-cleanup'
};

