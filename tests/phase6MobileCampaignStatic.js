"use strict";
const fs=require("fs"),path=require("path"); const root=path.resolve(__dirname,"..");
function read(f){return fs.readFileSync(path.join(root,f),"utf8");}
function assert(c,m){if(!c)throw new Error(m);} let n=0; function test(c,m){assert(c,m);n++;}
const index=read("index.html"), mobile=read("src/ui/mobileCampaign.js"), app=read("src/ui/renderApp.js"), main=read("src/main.js"), css=read("styles/responsive.css"), manifest=read("manifest.webmanifest"), schema=read("src/state/schema.js");
test(index.includes("src/ui/mobileCampaign.js"),"mobileCampaign script missing");
test(index.includes("mobileSelectionDock")&&index.includes("campaignRotateOverlay"),"mobile dock/rotate overlay missing");
test(index.includes("data-mobile-end-turn")&&index.includes('data-mobile-nav="map"')&&index.includes('data-mobile-nav="side"')&&index.includes('data-mobile-nav="council"'),"mobile nav incomplete");
test(/isMobileCampaignLayout/.test(mobile)&&/setMobileCampaignView/.test(mobile)&&/renderMobileSelectionDock/.test(mobile),"mobile campaign APIs missing");
test(/\["gold", "金"/.test(app)&&/\["food", "兵糧"/.test(app)&&/\["commands", "命令"/.test(app)&&/resource-/.test(app),"priority resource classes missing");
test(/function advanceSeason/.test(main)&&/mobileEndTurn/.test(main)&&/nextSeasonButton"\)\.addEventListener\("click", advanceSeason/.test(main),"season path not unified");
test(/body\.game-active\.mobile-campaign/.test(css)&&/data-mobile-view="map"/.test(css)&&/mobile-selection-dock/.test(css),"landscape game shell CSS missing");
test(/orientation: portrait/.test(css)&&/campaign-rotate-overlay/.test(css),"portrait overlay CSS missing");
test(/"orientation"\s*:\s*"landscape"/.test(manifest),"manifest landscape missing");
test(/version:\s*12/.test(schema)||/schemaVersion[^\n]*12/.test(schema),"schema changed unexpectedly");
console.log("Phase6 Mobile Campaign static: "+n+"/"+n+" PASS");
