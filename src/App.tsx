import { useState, useEffect, useRef } from 'react';
import { PhotoCard } from './components/PhotoCard';
import type { Photo, SwipeDirection } from './types';
import { Trash2, Heart, RefreshCw, AlertCircle, Images, Undo2, ListChecks, Copy, RotateCcw } from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getCaptureDate } from './web/exif';

// Define our custom plugin interface
interface PhotoLibraryPlugin {
  getPhotos(options: { limit: number }): Promise<{ photos: any[] }>;
  getPhotoThumbnail(options: { id: string }): Promise<{ base64: string }>;
  deletePhoto(options: { id: string }): Promise<void>;
}

// Access the plugin
const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibraryPlugin');

// En la app nativa se borra de la galería; en la web solo se marca para borrar.
const isNative = Capacitor.isNativePlatform();

function shuffle<T>(list: T[]): T[] {
  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

function describe(photo: Photo): string {
  const when = photo.takenAt ? dateFmt.format(photo.takenAt) : 'fecha desconocida';
  return `${photo.name ?? 'foto'} · ${when}`;
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [keptCount, setKeptCount] = useState(0);
  const [loading, setLoading] = useState(isNative);
  const [error, setError] = useState<string | null>(null);

  // Solo web
  const [history, setHistory] = useState<{ photo: Photo; direction: SwipeDirection }[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const allUrls = useRef<string[]>([]);

  useEffect(() => {
    if (!isNative) return;

    const loadPhotos = async () => {
      try {
        console.log("Fetching photos from native plugin (all)...");
        // PHFetchOptions.fetchLimit = 0 means "no limit" in iOS.
        const result = await PhotoLibrary.getPhotos({ limit: 0 });
        console.log(`Found ${result.photos.length} photos`);

        const mappedPhotos = result.photos.map((p: any) => ({
          id: p.id,
          url: '', // Will be loaded by the card
          nativeURL: p.localIdentifier,
        }));

        setPhotos(shuffle(mappedPhotos));
        setLoading(false);

      } catch (err: any) {
        console.error("Error loading photos:", err);
        setError("Error: " + (err.message || JSON.stringify(err)));
        setLoading(false);
      }
    };

    loadPhotos();
  }, []);

  // Libera la memoria de las fotos elegidas al salir
  useEffect(() => () => allUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setPreparing(true);
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    const picked = await Promise.all(list.map(async (file, i) => {
      const url = URL.createObjectURL(file);
      allUrls.current.push(url);
      return {
        id: `${Date.now()}-${i}-${file.name}`,
        url,
        name: file.name,
        takenAt: await getCaptureDate(file),
      } as Photo;
    }));
    setPhotos((prev) => [...prev, ...shuffle(picked)]);
    setReviewing(false);
    setPreparing(false);
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleSwipe = async (direction: SwipeDirection) => {
    if (direction === 'none' || photos.length === 0) return;

    const currentPhoto = photos[0];

    if (direction === 'left') {
      console.log('Deleting:', currentPhoto.id);
      setDeletedCount(prev => prev + 1);

      if (isNative) {
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

    if (!isNative) setHistory((prev) => [...prev, { photo: currentPhoto, direction }]);
    setPhotos(prev => prev.slice(1));
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((prev) => prev.slice(0, -1));
    if (last.direction === 'left') setDeletedCount((n) => n - 1);
    else setKeptCount((n) => n - 1);
    setPhotos((prev) => [last.photo, ...prev]);
  };

  const rescue = (photo: Photo) => {
    setHistory((prev) => prev.map((h) => (h.photo.id === photo.id ? { ...h, direction: 'right' } : h)));
    setDeletedCount((n) => n - 1);
    setKeptCount((n) => n + 1);
  };

  const toDelete = history.filter((h) => h.direction === 'left').map((h) => h.photo);

  const copyList = async () => {
    const text = toDelete.map(describe).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('Lista copiada');
    } catch {
      prompt('Copia la lista:', text);
    }
  };

  const reset = () => {
    if (isNative) {
      window.location.reload(); // Simple reload to re-fetch
      return;
    }
    if (toDelete.length && !confirm('Se perderá la lista de fotos marcadas. ¿Empezar de nuevo?')) return;
    allUrls.current.forEach((u) => URL.revokeObjectURL(u));
    allUrls.current = [];
    setPhotos([]);
    setHistory([]);
    setDeletedCount(0);
    setKeptCount(0);
    setReviewing(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Cargando fotos...</div>;
  }

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  const header = (
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
  );

  // ---------- Web: pantalla inicial ----------
  if (!isNative && photos.length === 0 && history.length === 0) {
    return (
      <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden text-white">
        {header}
        {picker}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <Images size={64} className="text-blue-400 mb-6" />
          <h2 className="text-2xl font-bold mb-3">Limpia tu galería</h2>
          <p className="text-gray-400 mb-2">
            Elige las fotos que quieras repasar. Desliza a la <span className="text-red-400 font-semibold">izquierda</span> para
            marcarlas para borrar y a la <span className="text-green-400 font-semibold">derecha</span> para quedártelas.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Al final verás la lista de fotos a borrar con su fecha para eliminarlas en la app Fotos.
            Las fotos no salen de tu móvil.
          </p>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={preparing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-full font-semibold hover:bg-blue-500 transition-colors disabled:opacity-60"
          >
            <Images size={20} />
            {preparing ? 'Preparando fotos...' : 'Elegir fotos'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Web: revisión de fotos marcadas ----------
  if (!isNative && (reviewing || photos.length === 0)) {
    return (
      <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden text-white">
        {header}
        {picker}
        <div className="flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-1">
              {photos.length === 0 ? '¡Listo!' : 'Revisión'} · {toDelete.length} foto{toDelete.length === 1 ? '' : 's'} para borrar
            </h2>
            {toDelete.length > 0 ? (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  La web no puede borrar fotos de tu galería. Abre la app Fotos, pulsa <b>Seleccionar</b> y elimina estas fotos
                  (usa la fecha para encontrarlas). Toca una foto aquí si al final quieres conservarla.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
                  {toDelete.map((p) => (
                    <button key={p.id} onClick={() => rescue(p)} className="text-left" title="Conservar esta foto">
                      <img src={p.url} alt={p.name} loading="lazy" className="w-full aspect-square object-cover rounded-lg border-2 border-red-500/60" />
                      <div className="text-[11px] text-gray-300 truncate mt-1">{p.name}</div>
                      <div className="text-[11px] text-gray-500">{p.takenAt ? dateFmt.format(p.takenAt) : 'Sin fecha'}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-400 mb-6">No has marcado ninguna foto para borrar.</p>
            )}
            <div className="flex flex-wrap gap-3">
              {photos.length > 0 && (
                <button onClick={() => setReviewing(false)} className="flex items-center gap-2 px-5 py-3 bg-blue-600 rounded-full font-semibold">
                  <Heart size={18} /> Seguir deslizando ({photos.length})
                </button>
              )}
              {toDelete.length > 0 && (
                <button onClick={copyList} className="flex items-center gap-2 px-5 py-3 bg-gray-700 rounded-full font-semibold">
                  <Copy size={18} /> Copiar lista
                </button>
              )}
              <button onClick={() => fileInput.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-gray-700 rounded-full font-semibold">
                <Images size={18} /> Añadir más fotos
              </button>
              <button onClick={reset} className="flex items-center gap-2 px-5 py-3 bg-gray-800 border border-gray-700 rounded-full font-semibold">
                <RotateCcw size={18} /> Empezar de nuevo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header with Safe Area */}
      {header}

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
          {!isNative && (
            <button
              onClick={undo}
              disabled={history.length === 0}
              aria-label="Deshacer"
              className="w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 border border-gray-700 active:scale-95 transition-transform disabled:opacity-30"
            >
              <Undo2 size={20} />
            </button>
          )}
          <button
            onClick={() => handleSwipe('left')}
            aria-label="Borrar"
            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-red-500 shadow-lg border border-gray-700 active:scale-95 transition-transform"
          >
            <Trash2 size={28} />
          </button>
          <button
            onClick={() => handleSwipe('right')}
            aria-label="Conservar"
            className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-green-500 shadow-lg border border-gray-700 active:scale-95 transition-transform"
          >
            <Heart size={28} />
          </button>
          {!isNative && (
            <button
              onClick={() => setReviewing(true)}
              aria-label="Revisar marcadas"
              className="w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center text-gray-300 border border-gray-700 active:scale-95 transition-transform"
            >
              <ListChecks size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
