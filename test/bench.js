const fs = require('fs'), NBT = require('../main.js');

var t = new Date(), u, v;
var o = {"comp>中文字符":{"str>测试":"String"}};
u = NBT.Writer(o, !0);
for(let i = 0;i < 1000000; i++){
  v = NBT.Reader(u, !0);
  u = NBT.Writer(v, !0);
}
console.log(new Date() - t)