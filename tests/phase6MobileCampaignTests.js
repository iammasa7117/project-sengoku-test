"use strict";
const fs=require("fs"),vm=require("vm"),path=require("path"); const root=path.resolve(__dirname,"..");
function assert(c,m){if(!c)throw new Error(m);} let n=0; function test(c,m){assert(c,m);n++;}
function makeClassList(){const set=new Set(); return {add:x=>set.add(x),remove:x=>set.delete(x),toggle:(x,v)=>{if(v===undefined){if(set.has(x))set.delete(x);else set.add(x);}else if(v)set.add(x);else set.delete(x);},contains:x=>set.has(x)};}
const els={};
function el(id){if(!els[id]) els[id]={id,innerHTML:"",dataset:{},attributes:{},classList:makeClassList(),querySelectorAll:function(){return this.buttons||[];},setAttribute:function(k,v){this.attributes[k]=String(v);},hasAttribute:function(k){return Object.prototype.hasOwnProperty.call(this.attributes,k);},focus:function(){this.focused=true;}}; return els[id];}
const nav=el("mobileNav"); nav.buttons=["map","side","council"].map(v=>({dataset:{mobileNav:v},attributes:{},setAttribute:function(k,val){this.attributes[k]=String(val);}}));
global.document={body:{dataset:{},classList:makeClassList()},getElementById:el};
global.window={matchMedia:()=>({matches:true})};
window.Sengoku={UI:{el,escape:v=>String(v).replace(/&/g,"&amp;")},State:{current:null}};
vm.runInThisContext(fs.readFileSync(path.join(root,"src/ui/mobileCampaign.js"),"utf8"),{filename:"mobileCampaign.js"});
const S=window.Sengoku,U=S.UI;
test(U.isMobileCampaignLayout()===true,"mobile layout detection");
test(U.setMobileCampaignView("side")===true&&document.body.dataset.mobileView==="side","set side view");
test(nav.buttons[1].attributes["aria-current"]==="page"&&nav.buttons[0].attributes["aria-current"]==="false","aria current sync");
test(U.setMobileCampaignView("bad")===false,"reject unknown view");
S.State.current={campaign:{selectedCastleId:"c1",playerFactionId:"f1",status:"active",gameOver:false,commands:2},castles:{c1:{id:"c1",name:"尾張城",factionId:"f1",guardTroops:120,defense:4}},factions:{f1:{name:"蒼月家"}},events:{intel:{}}};
U.renderMobileSelectionDock();
test(/尾張城/.test(el("mobileSelectionDock").innerHTML)&&/出陣/.test(el("mobileSelectionDock").innerHTML),"friendly dock actions");
S.State.current.castles.c1.factionId="f2"; S.State.current.factions.f2={name:"敵家"};
U.renderMobileSelectionDock();
test(/敵家/.test(el("mobileSelectionDock").innerHTML)&&!/出陣/.test(el("mobileSelectionDock").innerHTML),"enemy dock hides deploy");
U.updateMobileCampaignMode();
test(document.body.classList.contains("mobile-campaign"),"body mobile class");
console.log("Phase6 Mobile Campaign logic: "+n+"/"+n+" PASS");
