const fs = require('fs');

var binData = fs.readFileSync('C:\\Users\\32543\\Desktop\\temp4.mcstructure');

console.log(binData);

var worker = {
  processData: function (a) {
    var i = 0;
    for (; i < a.length; i++)
      if (a[i] == 0x0A) break;
    this.header = a.subarray(0, i),
      this.data = a.subarray(i),
      this.result = {},
      this.layer = 0,
      this.ptr = 0;
  },

  type: [null, "i8", "i16", "i32", "i64", "f32", "f64", "a8", "str", "list", "comp", "a32", "a64"],
  1: function () {
    return this.ptr++,
      this.data.readInt8(this.ptr - 1)
  },
  2: function () {
    return this.ptr += 2,
      this.data.readInt16LE(this.ptr - 2)
  },
  3: function () {
    return this.ptr += 4,
      this.data.readInt32LE(this.ptr - 4)
  },
  4: function () {
    return {
      low: (this.ptr += 4,
        this.data.readInt32LE(this.ptr - 4)
      ),
      high: (this.ptr += 4,
        this.data.readInt32LE(this.ptr - 4)
      )
    }
  },
  5: function () {
    return this.ptr += 4,
      this.data.readFloatLE(this.ptr - 4)
  },
  6: function () {
    return this.ptr += 8,
      this.data.readDoubleLE(this.ptr - 8)
  },
  7: function () {
    var a = this[3]()
      , b = [];
    for (; a > 0; a--)
      b.push(this[1]()),
        this.ptr++;
    return b
  },
  8: function () {
    var l = this.data.readUInt16LE(this.ptr), b;
    this.ptr += 2;
    b = this.data.toString('utf-8', this.ptr, this.ptr += l);
    return b
  },
  9: function () {
    var a, b = [];
    b.type = this.data.readInt8(this.ptr);
    this.ptr++;
    a = this[3]();
    if (this[b.type])
      for (; a > 0; a--)
        b.push(this[b.type]());
    else if (b.type == 0);
    else
      throw new Error(`Invalid tag ID at Byte${this.ptr - 1} : ${this.data[this.ptr - 1]}`);
    return b;
  },
  10: function () {
    var a, b = {}, c;
    while ((c = this.data[this.ptr]) > 0x00) {
      if (this[c])
        this.ptr++,
          a = this[8](),
          b[this.type[c] + ">" + a] = this[c]();
      else
        throw new Error('Invalid tag ID at Byte' + this.ptr + ' : ' + this.data[this.ptr]);
    }
    return this.ptr++, b;
  },
  11: function () {
    var a = this[3](),
      b = [];
    for (; a > 0; a--)
      b.push(this[3]()),
        this.ptr += 4;
    return b
  },
  12: function () {
    var a = this[3](),
      b = [];
    for (; a > 0; a--)
      b.push(this[3]()),
        this.ptr += 8;
    return b
  },

  parse: function () {
    var a, b, c;
    while (this.ptr < this.data.length) {
      c = this.data[this.ptr];
      if (this.data[this.ptr])
        this.ptr++,
          a = this[8](),
          this.result[this.type[c] + ">" + a] = this[c]();
      else
        throw new Error('Invalid tag ID at Byte' + this.ptr + ' : ' + this.data[this.ptr]);
      //console.log(this.result);
    }
  }
}

worker.processData(binData);
worker.parse();
console.log(worker.result);
console.log(JSON.stringify(worker.result));
