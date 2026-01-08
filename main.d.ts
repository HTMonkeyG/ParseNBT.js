declare class NBT {
  /**
   * Create a new empty NBT object.
   * @param isProxy - Create a new empty NBT object with proxy if true.
   */
  static create(isProxy?: boolean): object;

  /**
   * Returns a boolean value that indicates whether a value is a object created by NBT.create().
   */
  static isNBT(obj: object): boolean;

  /**
   * Returns the names with valid type-value pair of an NBT object.
   */
  static keys(obj: object): string[];

  /**
   * Copy the values of all of the NBT properties from one or more source objects 
   * to a target object.
   * 
   * Returns the target object.
   * 
   * @param target - The target object to copy to.
   * @param source - The source object from which to copy properties.
   */
  static assign(target: object, ...source: object[]): object;

  /**
   * Recursively detect whether objects are compvarely equal.
   */
  static equal(a: object, b: object): boolean;

  /**
   * Read NBT data in buffer.
   * 
   * @param buf - Input buffer.
   * @param option - Options.
   * @param option.littleEndian - Read as little endian if true.
   * @param option.asBigInt - Read i64 as BigInt if true.
   * @param option.asTypedArray - Read array and list as TypedArray if true.
   * @param option.asProxy - Create proxied NBT object.
   */
  static Reader(buf: ArrayBuffer, option?: { littleEndian: boolean, asBigInt: boolean, asTypedArray: boolean, asProxy: boolean }): object;

  /**
   * Read concatenated root label sequence.
   * 
   * @param buf - Input buffer.
   * @param option - Options.
   * @param option.littleEndian - Read as little endian if true.
   * @param option.asBigInt - Read i64 as BigInt if true.
   * @param option.asTypedArray - Read array and list as TypedArray if true.
   * @param option.asProxy - Create proxied NBT object.
   * @returns Array of NBT root tags.
   */
  static ReadSerial(buf: ArrayBuffer, option?: { littleEndian: boolean, asBigInt: boolean, asTypedArray: boolean, asProxy: boolean }): object;

  /**
   * Serialize NBT object.
   * 
   * @param obj - Input object.
   * @param option - Options.
   * @param option.littleEndian - Write as little endian if true.
   * @param option.noCheck - Disable circular reference detect for faster operation.
   */
  static Writer(obj: object, option?: { littleEndian: boolean, noCheck: boolean }): ArrayBuffer;

  /**
   * Creates a reader.
   * 
   * @param buf - Input buffer.
   * @param option - Options.
   * @param option.littleEndian - Read as little endian if true.
   * @param option.asBigInt - Read i64 as BigInt if true.
   * @param option.asTypedArray - Read array and list as TypedArray if true.
   * @param option.asProxy - Create proxied NBT object.
   */
  constructor(buf: ArrayBuffer, option?: { littleEndian: boolean, asBigInt: boolean, asTypedArray: boolean, asProxy: boolean });

  /**
   * Get the input buffer.
   */
  getBuffer(): ArrayBuffer;

  /**
   * Get current offset.
   */
  getOffset(): number;

  /**
   * Detect whether reached the end.
   */
  canRead(): boolean;

  /**
   * Read a single NBT root tag.
   * 
   * Returns null when read to the end.
   */
  read(): object | null;

  [Symbol.iterator](): { next: Function };
}

export = NBT;
