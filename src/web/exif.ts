// Lee la fecha de captura (EXIF DateTimeOriginal) de una foto JPEG.
// En la web el archivo elegido no conserva la fecha original en lastModified,
// así que la sacamos de los metadatos para poder localizar la foto en la galería.

const DATE_TAGS = [0x9003, 0x0132]; // DateTimeOriginal, DateTime

export async function getCaptureDate(file: File): Promise<Date | null> {
    try {
        const buf = await file.slice(0, 256 * 1024).arrayBuffer();
        const view = new DataView(buf);
        if (view.getUint16(0) !== 0xffd8) return null; // no es JPEG

        let offset = 2;
        while (offset + 4 < view.byteLength) {
            const marker = view.getUint16(offset);
            const size = view.getUint16(offset + 2);
            if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
                return parseExif(view, offset + 10);
            }
            if ((marker & 0xff00) !== 0xff00) return null;
            offset += 2 + size;
        }
    } catch {
        // metadatos ilegibles
    }
    return null;
}

function parseExif(view: DataView, tiff: number): Date | null {
    const little = view.getUint16(tiff) === 0x4949;
    const u16 = (o: number) => view.getUint16(o, little);
    const u32 = (o: number) => view.getUint32(o, little);

    const readIfd = (ifd: number): { date: Date | null; exifIfd: number | null } => {
        let date: Date | null = null;
        let exifIfd: number | null = null;
        const count = u16(ifd);
        for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12;
            if (entry + 12 > view.byteLength) break;
            const tag = u16(entry);
            if (tag === 0x8769) exifIfd = tiff + u32(entry + 8);
            if (DATE_TAGS.includes(tag)) {
                const d = readDate(view, tiff + u32(entry + 8));
                if (d && (tag === 0x9003 || !date)) date = d;
            }
        }
        return { date, exifIfd };
    };

    const ifd0 = readIfd(tiff + u32(tiff + 4));
    if (ifd0.exifIfd && ifd0.exifIfd < view.byteLength) {
        const sub = readIfd(ifd0.exifIfd);
        if (sub.date) return sub.date;
    }
    return ifd0.date;
}

function readDate(view: DataView, offset: number): Date | null {
    if (offset + 19 > view.byteLength) return null;
    let s = '';
    for (let i = 0; i < 19; i++) s += String.fromCharCode(view.getUint8(offset + i));
    // Formato "YYYY:MM:DD HH:MM:SS"
    const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!m) return null;
    const [, y, mo, d, h, mi, se] = m.map(Number);
    return new Date(y, mo - 1, d, h, mi, se);
}
