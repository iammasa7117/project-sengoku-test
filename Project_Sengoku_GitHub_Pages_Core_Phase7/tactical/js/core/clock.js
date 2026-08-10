(function (T) {
  "use strict";
  function Clock() { this.tickMs=100; this.speed=0; this.acc=0; this.last=0; }
  Clock.prototype.setSpeed=function(v){ this.speed=(v===1||v===3)?v:0; };
  Clock.prototype.frame=function(ts,step){
    if(!this.last) this.last=ts;
    var delta=Math.min(250,ts-this.last); this.last=ts;
    if(this.speed===0) return;
    this.acc += delta * this.speed;
    var guard=0;
    while(this.acc>=this.tickMs && guard<20){ step(); this.acc-=this.tickMs; guard++; }
  };
  T.Clock=Clock;
})(window.Tactical = window.Tactical || {});
