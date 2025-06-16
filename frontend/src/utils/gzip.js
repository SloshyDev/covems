// Utilidad para comprimir y descomprimir usando gzip (pako)
import pako from 'pako';

export function gzipCompress(obj) {
    const json = JSON.stringify(obj);
    return pako.gzip(json);
}

export function gzipDecompress(buffer) {
    const decompressed = pako.ungzip(buffer, { to: 'string' });
    return JSON.parse(decompressed);
}
