# API Document
```
/**
 * Read NBT data in buffer
 * @param {ArrayBuffer} buf - Input buffer
 * @param {Boolean} isLE - True if read as little endian
 * @returns
 */
NBT.Reader(buf: ArrayBuffer, isLE: Boolean): any

/**
 * Serialize object of specified structure
 * @param {*} obj - Input object
 * @param {Boolean} isLE - True if write as little endian
 * @returns {ArrayBuffer}
 */
NBT.Writer(obj: any, isLE: Boolean): ArrayBuffer

/**
 * Try to read a series of NBT data
 * @param {ArrayBuffer} buf - Input buffer
 * @param {Boolean} isLE - True if read as little endian
 * @returns {Array} Constains all of the NBT root tags
 */
NBT.ReadSerial(buf: ArrayBuffer, isLE: Boolean): any[]
```