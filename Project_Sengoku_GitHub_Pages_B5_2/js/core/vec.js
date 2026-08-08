(function (T) {
  "use strict";
  var V = {};
  V.add = function(a,b){ return {x:a.x+b.x,y:a.y+b.y}; };
  V.sub = function(a,b){ return {x:a.x-b.x,y:a.y-b.y}; };
  V.mul = function(a,s){ return {x:a.x*s,y:a.y*s}; };
  V.len = function(a){ return Math.sqrt(a.x*a.x+a.y*a.y); };
  V.norm = function(a){ var l=V.len(a); return l>1e-8?{x:a.x/l,y:a.y/l}:{x:0,y:0}; };
  V.dist = function(a,b){ return V.len(V.sub(a,b)); };
  V.clamp = function(v,min,max){ return Math.max(min,Math.min(max,v)); };
  T.Vec = V;
})(window.Tactical = window.Tactical || {});
