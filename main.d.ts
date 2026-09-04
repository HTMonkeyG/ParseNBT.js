declare class NBT {
  /**
   * A symbol to get the original object of a proxied NBT object.
   *
   * Only for debug use.
   */
  static readonly PROXIED_NBT: symbol;

  /**
   * Create a new empty NBT object.
   * @param isProxy - Create a new empty NBT object with proxy if true.
   */
  static create(isProxy?: boolean): object;

  /**
   * Returns a boolean value that indicates whether a value is a object created by NBT.create().
   */
  static isNBT(obj: unknown): boolean;

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
   * Recursively detect whether objects are completely equal.
   */
  static equal(a: unknown, b: unknown): boolean;

  /**
   * Read NBT data in buffer.
   *
   * @param buf - Input buffer, or any view of one.
   * @param option - Options.
   */
  static Reader(buf: NBT.Input, option?: NBT.ReadOption): object;

  /**
   * Read concatenated root label sequence.
   *
   * @param buf - Input buffer, or any view of one.
   * @param option - Options.
   * @returns Array of NBT root tags.
   */
  static ReadSerial(buf: NBT.Input, option?: NBT.ReadOption): object[];

  /**
   * Serialize NBT object.
   *
   * @param obj - Input object.
   * @param option - Options.
   */
  static Writer(obj: object, option?: NBT.WriteOption): ArrayBuffer;

  /**
   * Creates a reader.
   *
   * @param buf - Input buffer, or any view of one.
   * @param option - Options.
   */
  constructor(buf: NBT.Input, option?: NBT.ReadOption);

  /**
   * Get the input buffer.
   */
  getBuffer(): NBT.Input;

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

  /**
   * Iterate the root tags left in the buffer, starting at the current offset
   * without consuming this reader.
   */
  [Symbol.iterator](): IterableIterator<object>;
}

declare namespace NBT {
  /** An ArrayBuffer, or any view of one such as a TypedArray or a Node Buffer. */
  type Input = ArrayBuffer | ArrayBufferView;

  interface ReadOption {
    /** Read as little endian if true. */
    littleEndian?: boolean;
    /** Read i64 as BigInt if true. */
    asBigInt?: boolean;
    /** Read array and list as TypedArray if true. */
    asTypedArray?: boolean;
    /** Create proxied NBT object. */
    asProxy?: boolean;
  }

  interface WriteOption {
    /** Write as little endian if true. */
    littleEndian?: boolean;
    /** Disable circular reference detect for faster operation. */
    noCheck?: boolean;
  }
}

export = NBT;
