(function (T) {
  "use strict";
  function RNG(seed) {
    this.state = (Number(seed) >>> 0) || 0x9e3779b9;
  }
  RNG.prototype.nextUint = function () {
    var x = this.state >>> 0;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    this.state = x >>> 0;
    return this.state;
  };
  RNG.prototype.float = function () { return this.nextUint() / 4294967296; };
  RNG.prototype.range = function (min, max) { return min + (max - min) * this.float(); };
  T.RNG = RNG;
})(window.Tactical = window.Tactical || {});
