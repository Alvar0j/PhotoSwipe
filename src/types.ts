export interface Photo {
    id: string; // Native ID or URL
    url: string;
    nativeURL?: string; // For deletion
    date?: string;
    name?: string; // Web: nombre del archivo elegido
    takenAt?: Date | null; // Web: fecha de captura (EXIF)
}

export type SwipeDirection = 'left' | 'right' | 'none';
