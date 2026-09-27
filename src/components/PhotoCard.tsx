import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { Photo, SwipeDirection } from '../types';
import { Trash2, Heart, ImageOff } from 'lucide-react';
import { PhotoLibrary } from '../native';
import { Capacitor } from '@capacitor/core';

interface PhotoCardProps {
    photo: Photo;
    onSwipe: (direction: SwipeDirection) => void;
    isFront: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onSwipe, isFront }) => {
    const [imageSrc, setImageSrc] = useState<string>(photo.url);
    const [isLoading, setIsLoading] = useState(false);

    // Load thumbnail if native and no URL
    useEffect(() => {
        const loadThumbnail = async () => {
            if (!photo.url && photo.id && Capacitor.isNativePlatform()) {
                try {
                    setIsLoading(true);
                    const result = await PhotoLibrary.getPhotoThumbnail({ id: photo.id });
                    if (result.base64) {
                        setImageSrc(`data:image/jpeg;base64,${result.base64}`);
                    }
                } catch (err) {
                    console.error("Failed to load thumbnail", err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setImageSrc(photo.url); // Ensure imageSrc is updated if photo.url changes
            }
        };

        // Only load if front or next (optimization)
        loadThumbnail();
    }, [photo.id, photo.url]);

    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

    // Color overlays
    const deleteOpacity = useTransform(x, [-150, -50], [1, 0]);
    const keepOpacity = useTransform(x, [50, 150], [0, 1]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    const CardContent = () => (
        <div className="relative w-full h-full max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
            {imageSrc ? (
                <img
                    src={imageSrc}
                    alt="Current photo"
                    className="w-full h-full object-contain pointer-events-none"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
                    {isLoading ? (
                        <span className="animate-pulse">Cargando imagen...</span>
                    ) : (
                        <div className="flex flex-col items-center">
                            <ImageOff size={48} className="mb-2" />
                            <span>No Image</span>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Overlay */}
            <motion.div
                style={{ opacity: deleteOpacity }}
                className="absolute inset-0 bg-red-500/30 flex items-center justify-center pointer-events-none"
            >
                <div className="border-4 border-red-500 rounded-lg p-4 transform -rotate-12">
                    <Trash2 className="w-24 h-24 text-red-500" />
                    <span className="text-4xl font-bold text-red-500 uppercase block text-center mt-2">Delete</span>
                </div>
            </motion.div>

            {/* Keep Overlay */}
            <motion.div
                style={{ opacity: keepOpacity }}
                className="absolute inset-0 bg-green-500/30 flex items-center justify-center pointer-events-none"
            >
                <div className="border-4 border-green-500 rounded-lg p-4 transform rotate-12">
                    <Heart className="w-24 h-24 text-green-500" />
                    <span className="text-4xl font-bold text-green-500 uppercase block text-center mt-2">Keep</span>
                </div>
            </motion.div>
        </div>
    );

    if (!isFront) {
        return (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center p-4">
                <CardContent />
                <div className="absolute inset-0 bg-black/10 rounded-2xl pointer-events-none" />
            </div>
        );
    }

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center p-4 z-10"
        >
            <CardContent />
        </motion.div>
    );
};
