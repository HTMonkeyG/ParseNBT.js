const fs = require('fs')
  , NBT = require('./main.new.js');

var binData = toArrayBuffer(fs.readFileSync(__dirname + '/test/test.mcstructure'));

// Buffer ---> ArrayBuffer
function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

// Strip Bedrock .mcstructure header (8 bytes: version + data length).
function stripBedrockHeader(buf) {
  if (buf.byteLength > 8) {
    var dv = new DataView(buf);
    if (dv.getUint32(4, true) === buf.byteLength - 8)
      return buf.slice(8);
  }
  return buf;
}

// Hex dump helper.
function bufToHex(buf, offset, len) {
  var arr = new Uint8Array(buf);
  offset = offset || 0;
  len = Math.min(arr.length - offset, len || 64);
  var result = [];
  for (var i = offset; i < offset + len; i++)
    result.push(arr[i].toString(16).padStart(2, '0'));
  return result.join(' ');
}

// ── Test 1: Read .mcstructure ──────────────────────────────────────────
function test1() {
  console.log("1  Read .mcstructure file (littleEndian)");
  var result = NBT.Reader(binData, { littleEndian: true });
  if (!result || !NBT.isNBT(result))
    throw new Error("Failed to read NBT data");

  var keys = NBT.keys(result);
  console.log("   Root keys: " + keys.join(", "));
  if (!keys.length)
    throw new Error("No NBT keys in root object");
  console.log("   PASSED");
  return result;
}

// ── Test 2: Write NBT back ─────────────────────────────────────────────
function test2(nbtObj) {
  console.log("2  Write NBT data back (littleEndian)");
  var written = NBT.Writer(nbtObj, { littleEndian: true });
  if (!written || !written.byteLength)
    throw new Error("Failed to write NBT data");
  console.log("   Written size: " + written.byteLength + " bytes");
  console.log("   PASSED");
  return written;
}

// ── Test 3: Binary comparison ──────────────────────────────────────────
function test3(originalBin, writtenBin) {
  console.log("3  Binary comparison (strip Bedrock header from original)");
  var pureNBT = stripBedrockHeader(originalBin);
  console.log("   Original NBT size: " + pureNBT.byteLength + " bytes");
  console.log("   Written NBT size:  " + writtenBin.byteLength + " bytes");

  if (pureNBT.byteLength !== writtenBin.byteLength) {
    console.log("   Original (first 48): " + bufToHex(pureNBT, 0, 48));
    console.log("   Written  (first 48): " + bufToHex(writtenBin, 0, 48));
    throw new Error("Size mismatch: " + pureNBT.byteLength + " vs " + writtenBin.byteLength);
  }

  var origView = new Uint8Array(pureNBT);
  var writView = new Uint8Array(writtenBin);

  // Compare byte by byte.
  for (var i = 0; i < origView.length; i++) {
    if (origView[i] !== writView[i]) {
      var start = Math.max(0, i - 4);
      console.log("   First mismatch at byte " + i);
      console.log("   Original @" + start + ": " + bufToHex(pureNBT, start, 24));
      console.log("   Written  @" + start + ": " + bufToHex(writtenBin, start, 24));
      throw new Error("Binary mismatch at byte " + i
        + ": orig=0x" + origView[i].toString(16)
        + " writ=0x" + writView[i].toString(16));
    }
  }

  console.log("   Binary data matches! (" + origView.length + " bytes identical)");
  console.log("   PASSED");
}

// ── Test 4: Object equality after roundtrip ────────────────────────────
function test4(nbtObj) {
  console.log("4  Roundtrip: write then re-read, compare objects");
  var written = NBT.Writer(nbtObj, { littleEndian: true });
  var reRead = NBT.Reader(written, { littleEndian: true });

  if (!NBT.equal(nbtObj, reRead)) {
    console.log("   Original keys: " + NBT.keys(nbtObj).join(", "));
    console.log("   Re-read keys: " + NBT.keys(reRead).join(", "));
    throw new Error("Roundtrip equality test failed");
  }

  console.log("   Objects are equal after roundtrip");
  console.log("   PASSED");
}

// Helper: compare two ArrayBuffers byte-by-byte.
function bufEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  var va = new Uint8Array(a), vb = new Uint8Array(b);
  for (var i = 0; i < va.length; i++)
    if (va[i] !== vb[i]) return false;
  return true;
}

// Helper: full roundtrip — write(obj) should equal write(read(write(obj))).
function stableRoundtrip(obj, option) {
  var w1 = NBT.Writer(obj, option);
  var r = NBT.Reader(w1, option);
  var w2 = NBT.Writer(r, option);
  return bufEqual(w1, w2);
}

// ── Test 5: Simple create/write/read (Java Edition / big-endian) ───────
function test5() {
  console.log("5  Simple NBT create / write / read (big-endian)");
  var obj = NBT.create(true);
  obj["i32>testInt"] = 42;
  obj["str>testStr"] = "Hello World";
  obj["f64>testFloat"] = 3.14159;
  obj["i16>testShort"] = -1000;
  obj["i08>testByte"] = 127;

  var written = NBT.Writer(obj, { littleEndian: false });
  if (!written || !written.byteLength)
    throw new Error("Failed to write simple NBT");

  if (!stableRoundtrip(obj, { littleEndian: false }))
    throw new Error("Simple roundtrip stability failed");

  console.log("   Simple NBT roundtrip stable, size: " + written.byteLength + " bytes");
  console.log("   PASSED");
}

// ── Test 6: Nested compound and list ───────────────────────────────────
function test6() {
  console.log("6  Test nested compound and list");
  var obj = NBT.create(true);
  obj["obj>nested"] = NBT.create(true);
  var nested = obj["obj>nested"];
  nested["i32>a"] = 1;
  nested["i32>b"] = 2;
  nested["str>name"] = "nested_test";
  nested["f32>pi"] = 3.14;

  obj["lst>listTest"] = ["i32", 10, 20, 30, 40, 50];

  if (!stableRoundtrip(obj, { littleEndian: false }))
    throw new Error("Nested compound/list roundtrip failed");

  console.log("   Nested structure roundtrip stable");
  console.log("   PASSED");
}

// ── Test 7: Byte array and int array types ─────────────────────────────
function test7() {
  console.log("7  Test byte array (a08) and int arrays (a32/a64)");
  var obj = NBT.create(true);
  obj["a08>bytes"] = [0, 127, -128, -1, 5, 10];
  obj["a32>ints"] = [1000000, -2000000, 3000000, -4000000];
  obj["a64>longs"] = [{ high: 1, low: 2 }, { high: -1, low: -1 }];

  if (!stableRoundtrip(obj, { littleEndian: false }))
    throw new Error("Byte/int array roundtrip failed");

  console.log("   Arrays roundtrip stable");
  console.log("   PASSED");
}

// ── Test 8: Empty structures ───────────────────────────────────────────
function test8() {
  console.log("8  Test empty compound and empty list");
  var obj = NBT.create(true);
  obj["obj>empty"] = NBT.create(true);
  obj["lst>emptyList"] = ["i32"];  // empty list with type hint

  if (!stableRoundtrip(obj, { littleEndian: false }))
    throw new Error("Empty structures roundtrip failed");

  console.log("   Empty structures roundtrip stable");
  console.log("   PASSED");
}

// ── Test 9: Circular reference detection ───────────────────────────────
function test9() {
  console.log("9  Test circular reference detection");
  var obj = NBT.create(true);
  obj["obj>self"] = obj;  // circular reference!

  var threw = false;
  try {
    NBT.Writer(obj, { littleEndian: false });
  } catch (e) {
    threw = true;
    console.log("   Caught: " + e.message);
  }

  if (!threw)
    throw new Error("Should have thrown on circular reference");

  console.log("   PASSED");
}

// ── Test 10: noCheck option skips circular detection ───────────────────
function test10() {
  console.log("10 Test noCheck option");
  var obj = NBT.create(true);
  obj["i32>x"] = 100;

  // noCheck should work for normal objects without error
  var written = NBT.Writer(obj, { littleEndian: false, noCheck: true });
  if (!written || !written.byteLength)
    throw new Error("noCheck write failed");

  // Verify roundtrip stability.
  if (!stableRoundtrip(obj, { littleEndian: false, noCheck: true }))
    throw new Error("noCheck roundtrip failed");

  console.log("   noCheck roundtrip OK");
  console.log("   PASSED");
}

// ═══════════════════════════════════════════════════════════════════════
try {
  console.log("=== NBT Writer Tests ===\n");

  var nbtObj = test1();
  var writtenBin = test2(nbtObj);
  test3(binData, writtenBin);
  test4(nbtObj);
  test5();
  test6();
  test7();
  test8();
  test9();
  test10();

  console.log("\n=== All tests passed! ===");
} catch (e) {
  console.error("\n*** TEST FAILED ***");
  console.error(e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
}
