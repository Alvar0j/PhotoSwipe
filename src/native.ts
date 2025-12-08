import { registerPlugin } from '@capacitor/core';

export interface PhotoLibraryPlugin {
    getPhotos(options: { limit: number }): Promise<{ photos: any[] }>;
    getPhotoThumbnail(options: { id: string }): Promise<{ base64: string }>;
    deletePhoto(options: { id: string }): Promise<void>;
}

export const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibraryPlugin');
