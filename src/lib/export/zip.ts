import crypto from "crypto";

// Minimal ZIP writer (no compression) for MVP export packs.

function crc32(buf: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n & 0xffff, 0);
  return b;
}

function u32(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

function dosTimeDate(d: Date) {
  const time =
    ((d.getHours() & 0x1f) << 11) |
    ((d.getMinutes() & 0x3f) << 5) |
    ((Math.floor(d.getSeconds() / 2) & 0x1f) << 0);
  const date =
    (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | ((d.getDate() & 0x1f) << 0);
  return { time, date };
}

export type ZipFile = {
  name: string; // forward slashes
  bytes: Uint8Array;
};

export function createZipStore(files: ZipFile[]) {
  const now = new Date();
  const { time, date } = dosTimeDate(now);

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name.replace(/\\/g, "/"), "utf8");
    const dataBuf = Buffer.from(f.bytes);
    const crc = crc32(dataBuf);
    const size = dataBuf.length;

    // Local file header
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // compression (store)
      u16(time),
      u16(date),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0), // extra len
      nameBuf,
    ]);

    localParts.push(localHeader, dataBuf);

    // Central directory header
    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0),
      u16(0),
      u16(time),
      u16(date),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBuf,
    ]);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBuf.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const centralOffset = offset;
  const centralSize = centralDir.length;

  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralSize),
    u32(centralOffset),
    u16(0),
  ]);

  const zipBytes = Buffer.concat([...localParts, centralDir, end]);
  const checksum = crypto.createHash("sha256").update(zipBytes).digest("hex");
  return { bytes: new Uint8Array(zipBytes), checksum };
}

