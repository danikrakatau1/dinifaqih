(() => {
  const te = new TextEncoder();
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const time = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
    const day = ((year - 1980) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
    return { time, day };
  }

  function concat(parts) {
    const size = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(size);
    let at = 0;
    for (const p of parts) { out.set(p, at); at += p.length; }
    return out;
  }

  function u16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); return b; }
  function u32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); return b; }

  async function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
    return te.encode(String(value));
  }

  async function buildZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    const stamp = dosDateTime();

    for (const entry of entries) {
      const name = te.encode(entry.name.replace(/^\/+/, '').replace(/\\/g, '/'));
      const data = await toBytes(entry.data);
      const crc = crc32(data);
      const flags = 0x0800; // UTF-8 names

      const local = concat([
        u32(0x04034b50), u16(20), u16(flags), u16(0), u16(stamp.time), u16(stamp.day),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data
      ]);
      localParts.push(local);

      const central = concat([
        u32(0x02014b50), u16(20), u16(20), u16(flags), u16(0), u16(stamp.time), u16(stamp.day),
        u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(offset), name
      ]);
      centralParts.push(central);
      offset += local.length;
    }

    const central = concat(centralParts);
    const end = concat([
      u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
      u32(central.length), u32(offset), u16(0)
    ]);
    return new Blob([...localParts, central, end], { type: 'application/zip' });
  }

  async function fetchProjectFile(path) {
    const url = new URL(path, document.baseURI);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  window.UNDANGAN_ZIP = { buildZip, fetchProjectFile };
})();

/* Rebuild Studio V1: STORE-ZIP reader for packages created by this engine. */
(() => {
  const td = new TextDecoder('utf-8');
  function readStoreZip(buffer){
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const files = new Map();
    let p = 0;
    while (p + 30 <= bytes.length) {
      const sig = dv.getUint32(p, true);
      if (sig !== 0x04034b50) break;
      const method = dv.getUint16(p + 8, true);
      const compressedSize = dv.getUint32(p + 18, true);
      const uncompressedSize = dv.getUint32(p + 22, true);
      const nameLen = dv.getUint16(p + 26, true);
      const extraLen = dv.getUint16(p + 28, true);
      const nameStart = p + 30;
      const dataStart = nameStart + nameLen + extraLen;
      const name = td.decode(bytes.slice(nameStart, nameStart + nameLen));
      if(method !== 0) throw new Error('ZIP memakai kompresi yang belum didukung. Gunakan ZIP hasil Rebuild Studio.');
      const data = bytes.slice(dataStart, dataStart + compressedSize);
      if(uncompressedSize !== data.length) throw new Error('Ukuran entry ZIP tidak valid: '+name);
      files.set(name, data);
      p = dataStart + compressedSize;
    }
    return {
      files,
      text(name){ const b=files.get(name); if(!b) return null; return td.decode(b); },
      json(name){ const s=this.text(name); if(s==null) return null; return JSON.parse(s); }
    };
  }
  if(window.UNDANGAN_ZIP) window.UNDANGAN_ZIP.readStoreZip = readStoreZip;
})();
