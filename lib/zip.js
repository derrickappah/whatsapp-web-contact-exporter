/**
 * Ultra-Lightweight Pure JavaScript ZIP File Generator (PKZIP format)
 * Zero external dependencies. Works in browsers and Node.js.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WAZip = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // CRC-32 Lookup Table
  const CRC_TABLE = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    CRC_TABLE[i] = c;
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function strToUtf8(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    return Buffer.from(str, 'utf8');
  }

  class ZipArchive {
    constructor() {
      this.files = [];
    }

    addFile(filename, content) {
      const data = typeof content === 'string' ? strToUtf8(content) : new Uint8Array(content);
      const nameBytes = strToUtf8(filename);
      const checksum = crc32(data);

      this.files.push({
        name: filename,
        nameBytes,
        data,
        checksum,
        size: data.length
      });
    }

    generateUint8Array() {
      const parts = [];
      const centralDir = [];
      let offset = 0;

      const date = new Date();
      const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
      const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

      for (const file of this.files) {
        // Local File Header (30 bytes + name + data)
        const localHeader = new Uint8Array(30 + file.nameBytes.length);
        const view = new DataView(localHeader.buffer);

        view.setUint32(0, 0x04034b50, true); // Local header signature
        view.setUint16(4, 20, true);         // Version needed (2.0)
        view.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
        view.setUint16(8, 0, true);          // Compression method (0 = Store / uncompressed)
        view.setUint16(10, dosTime, true);
        view.setUint16(12, dosDate, true);
        view.setUint32(14, file.checksum, true);
        view.setUint32(18, file.size, true); // Compressed size
        view.setUint32(22, file.size, true); // Uncompressed size
        view.setUint16(26, file.nameBytes.length, true);
        view.setUint16(28, 0, true);         // Extra field length

        localHeader.set(file.nameBytes, 30);

        parts.push(localHeader);
        parts.push(file.data);

        // Central Directory Header (46 bytes + name)
        const cdHeader = new Uint8Array(46 + file.nameBytes.length);
        const cdView = new DataView(cdHeader.buffer);

        cdView.setUint32(0, 0x02014b50, true); // Central dir signature
        cdView.setUint16(4, 20, true);          // Version made by
        cdView.setUint16(6, 20, true);          // Version needed
        cdView.setUint16(8, 0x0800, true);      // UTF-8 flag
        cdView.setUint16(10, 0, true);          // Compression method
        cdView.setUint16(12, dosTime, true);
        cdView.setUint16(14, dosDate, true);
        cdView.setUint32(16, file.checksum, true);
        cdView.setUint32(20, file.size, true);
        cdView.setUint32(24, file.size, true);
        cdView.setUint16(28, file.nameBytes.length, true);
        cdView.setUint16(30, 0, true);          // Extra field len
        cdView.setUint16(32, 0, true);          // File comment len
        cdView.setUint16(34, 0, true);          // Disk number start
        cdView.setUint16(36, 0, true);          // Internal file attributes
        cdView.setUint32(38, 0, true);          // External file attributes
        cdView.setUint32(42, offset, true);     // Relative offset of local header

        cdHeader.set(file.nameBytes, 46);
        centralDir.push(cdHeader);

        offset += localHeader.length + file.data.length;
      }

      let cdSize = 0;
      centralDir.forEach(cd => { cdSize += cd.length; });

      // End of Central Directory Record (22 bytes)
      const eocd = new Uint8Array(22);
      const eocdView = new DataView(eocd.buffer);

      eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
      eocdView.setUint16(4, 0, true);          // Disk number
      eocdView.setUint16(6, 0, true);          // Disk with central dir
      eocdView.setUint16(8, this.files.length, true);  // Entries on this disk
      eocdView.setUint16(10, this.files.length, true); // Total entries
      eocdView.setUint32(12, cdSize, true);    // Central dir size
      eocdView.setUint32(16, offset, true);    // Offset of central dir
      eocdView.setUint16(20, 0, true);         // Comment length

      const allParts = [...parts, ...centralDir, eocd];
      let totalSize = 0;
      allParts.forEach(p => { totalSize += p.length; });

      const combined = new Uint8Array(totalSize);
      let pos = 0;
      allParts.forEach(p => {
        combined.set(p, pos);
        pos += p.length;
      });

      return combined;
    }

    generateBlob() {
      const u8 = this.generateUint8Array();
      if (typeof Blob !== 'undefined') {
        return new Blob([u8], { type: 'application/zip' });
      }
      return Buffer.from(u8.buffer);
    }
  }

  function createZip() {
    return new ZipArchive();
  }

  return {
    createZip,
    ZipArchive
  };
}));
