// 1:1 复刻 Laya `laya.utils.Byte` 接口（仅写入侧 + 必要的属性）
// 用 Node.js Buffer 实现，按需扩容、小端序，UTFString 用 uint16 长度前缀 + UTF-8

function Byte() {
  this._u8 = new Uint8Array(8);
  this._dv = new DataView(this._u8.buffer);
  this._pos = 0;
  this._len = 0;
  this._le = true; // littleEndian
}

Object.defineProperty(Byte.prototype, 'pos', {
  get() { return this._pos; },
  set(v) { this._pos = v; if (v > this._len) this._len = v; },
});
Object.defineProperty(Byte.prototype, 'endian', {
  get() { return this._le ? 'littleEndian' : 'bigEndian'; },
  set(v) { this._le = (v !== 'bigEndian'); },
});
// Laya 中 `bytes.buffer` 返回有效字节范围的 ArrayBuffer 切片
Object.defineProperty(Byte.prototype, 'buffer', {
  get() { return this._u8.buffer.slice(0, this._len); },
});
Object.defineProperty(Byte.prototype, 'length', {
  get() { return this._len; },
  set(v) {
    this._ensure(v);
    this._len = v;
    if (this._pos > v) this._pos = v;
  },
});

Byte.prototype._ensure = function (needPos) {
  if (needPos <= this._u8.byteLength) return;
  let cap = this._u8.byteLength;
  while (cap < needPos) cap *= 2;
  const nu = new Uint8Array(cap);
  nu.set(this._u8);
  this._u8 = nu;
  this._dv = new DataView(nu.buffer);
};

Byte.prototype._bump = function (n) {
  this._pos += n;
  if (this._pos > this._len) this._len = this._pos;
};

Byte.prototype.writeByte = function (v) {
  this._ensure(this._pos + 1);
  this._dv.setInt8(this._pos, v);
  this._bump(1);
};

Byte.prototype.writeUint8 = function (v) {
  this._ensure(this._pos + 1);
  this._dv.setUint8(this._pos, v);
  this._bump(1);
};

Byte.prototype.writeInt16 = function (v) {
  this._ensure(this._pos + 2);
  this._dv.setInt16(this._pos, v, this._le);
  this._bump(2);
};

Byte.prototype.writeUint16 = function (v) {
  this._ensure(this._pos + 2);
  this._dv.setUint16(this._pos, v, this._le);
  this._bump(2);
};

Byte.prototype.writeInt32 = function (v) {
  this._ensure(this._pos + 4);
  this._dv.setInt32(this._pos, v, this._le);
  this._bump(4);
};

Byte.prototype.writeUint32 = function (v) {
  this._ensure(this._pos + 4);
  this._dv.setUint32(this._pos, v, this._le);
  this._bump(4);
};

Byte.prototype.writeFloat32 = function (v) {
  this._ensure(this._pos + 4);
  this._dv.setFloat32(this._pos, v, this._le);
  this._bump(4);
};

Byte.prototype.writeUTFBytes = function (value) {
  value = String(value);
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c <= 0x7F) {
      this.writeByte(c);
    } else if (c <= 0x7FF) {
      this._ensure(this._pos + 2);
      this._u8[this._pos] = 0xC0 | (c >> 6);
      this._u8[this._pos + 1] = 0x80 | (c & 0x3F);
      this._bump(2);
    } else if (c <= 0xFFFF) {
      this._ensure(this._pos + 3);
      this._u8[this._pos] = 0xE0 | (c >> 12);
      this._u8[this._pos + 1] = 0x80 | ((c >> 6) & 0x3F);
      this._u8[this._pos + 2] = 0x80 | (c & 0x3F);
      this._bump(3);
    } else {
      this._ensure(this._pos + 4);
      this._u8[this._pos] = 0xF0 | (c >> 18);
      this._u8[this._pos + 1] = 0x80 | ((c >> 12) & 0x3F);
      this._u8[this._pos + 2] = 0x80 | ((c >> 6) & 0x3F);
      this._u8[this._pos + 3] = 0x80 | (c & 0x3F);
      this._bump(4);
    }
  }
};

Byte.prototype.writeUTFString = function (value) {
  const startPos = this._pos;
  this.writeUint16(0); // 占位
  this.writeUTFBytes(value);
  const dataLen = this._pos - startPos - 2;
  this._dv.setUint16(startPos, dataLen, this._le);
};

Byte.prototype.toBuffer = function () {
  return Buffer.from(this._u8.buffer, 0, this._len);
};

module.exports = Byte;
