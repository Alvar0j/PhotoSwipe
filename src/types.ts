export interface Photo {
    id: string; // Native ID or URL
    url: string;
    nativeURL?: string; // For deletion
    date?: string;
}

export type SwipeDirection = 'left' | 'right' | 'none';
