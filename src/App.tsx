import { useState, useEffect } from 'react';
import { PhotoCard } from './components/PhotoCard';
import type { Photo, SwipeDirection } from './types';
import { Trash2, Heart, RefreshCw, AlertCircle } from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';

// Define our custom plugin interface
interface PhotoLibraryPlugin {
  getPhotos(options: { limit: number }): Promise<{ photos: any[] }>;
  getPhotoThumbnail(options: { id: string }): Promise<{ base64: string }>;
  deletePhoto(options: { id: string }): Promise<void>;
}

// Access the plugin
const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibraryPlugin');

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [keptCount, setKeptCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      if (!Capacitor.isNativePlatform()) {
        // Mock data for browser
        setPhotos([
          { id: '1', url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba' },
          { id: '2', url: 'https://images.unsplash.com/photo-1682687221038-404670e01d46' },
        ]);
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching photos from native plugin (all)...");
        // Limit 0 indicates no limit in our plugin implementation logic (implied by PHFetchOptions check usually taking 0 as no limit or we rely on the plugin handling it)
        // Wait, looking at the swift code: let limit = call.getInt("limit") ?? 50. If I pass 0, it takes 0.
        // PHFetchOptions.fetchLimit = 0 means "no limit" in iOS.
        const result = await PhotoLibrary.getPhotos({ limit: 0 });
        console.log(`Found ${result.photos.length} photos`);

        const mappedPhotos = result.photos.map((p: any) => ({
          id: p.id,
          url: '', // Will be loaded by the card
          nativeURL: p.localIdentifier,
        }));

        // Fisher-Yates shuffle
        for (let i = mappedPhotos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mappedPhotos[i], mappedPhotos[j]] = [mappedPhotos[j], mappedPhotos[i]];
        }

        setPhotos(mappedPhotos);
        setLoading(false);

      } catch (err: any) {
        console.error("Error loading photos:", err);
        setError("Error: " + (err.message || JSON.stringify(err)));
        setLoading(false);
      }
    };

    loadPhotos();
  }, []);

  const handleSwipe = async (direction: SwipeDirection) => {
    if (direction === 'none' || photos.length === 0) return;

    const currentPhoto = photos[0];

    if (direction === 'left') {
      console.log('Deleting:', currentPhoto.id);
      setDeletedCount(prev => prev + 1);

      if (Capacitor.isNativePlatform()) {
        try {
          await PhotoLibrary.deletePhoto({ id: currentPhoto.id });
          console.log('Deleted successfully');
        } catch (err) {
          console.error("Delete failed", err);
          // Optional: Show user error
        }
      }
    } else {
      console.log('Keeping:', currentPhoto.id);
      setKeptCount(prev => prev + 1);
    }

    setPhotos(prev => prev.slice(1));
  };

  const reset = () => {
    window.location.reload(); // Simple reload to re-fetch
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Cargando fotos...</div>;
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header with Safe Area */}
      <div className="bg-gray-800 shadow-md z-20 pt-[env(safe-area-inset-top)]">
        <div className="h-14 flex items-center justify-between px-4 text-white">
          <div className="flex items-center gap-2">
            <Trash2 size={20} className="text-red-400" />
            <span className="font-bold">{deletedCount}</span>
          </div>
          <h1 className="font-bold text-lg">PhotoSwipe</h1>
          <div className="flex items-center gap-2">
            <span className="font-bold">{keptCount}</span>
            <Heart size={20} className="text-green-400" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 m-4 rounded flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Card Stack */}
      <div className="flex-1 relative w-full max-w-md mx-auto">
        {photos.length > 0 ? (
          <>
            {/* Next Card (Background) */}
            {photos.length > 1 && (
              <PhotoCard
                key={photos[1].id}
                photo={photos[1]}
                onSwipe={() => { }}
                isFront={false}
              />
            )}

            {/* Current Card (Foreground) */}
            <PhotoCard
              key={photos[0].id}
              photo={photos[0]}
              onSwipe={handleSwipe}
              isFront={true}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">¡Listo!</h2>
            <p className="mb-8 text-gray-400">Has revisado las fotos recientes.</p>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-full font-semibold hover:bg-blue-500 transition-colors"
            >
              <RefreshCw size={20} />
              Cargar más (Reiniciar)
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      {photos.length > 0 && (
        <div className="flex items-center justify-center gap-8 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 z-20">
          <button
            onClick={() => handleSwipe('left')}
            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-red-500 shadow-lg border border-gray-700 active:scale-95 transition-transform"
          >
            <Trash2 size={28} />
          </button>
          <button
            onClick={() => handleSwipe('right')}
            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-green-500 shadow-lg border border-gray-700 active:scale-95 transition-transform"
          >
            <Heart size={28} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
