var Export = {
    buildData: function() {
        var p = ProjectManager.getActive();
        if (!p) return null;
        var chars = p.config.characters || [];
        var config = {
            title: p.config.title,
            subtitle: p.config.subtitle,
            characters: chars.map(function(c) {
                return {
                    id: c.id, name: c.name, role: c.role,
                    icon: c.icon, classPreset: c.classPreset,
                    clothing: c.clothing, states: c.states,
                    defaultState: c.defaultState, bodyParts: c.bodyParts
                };
            }),
            stats: p.config.stats || [],
            extraSettings: p.config.extraSettings || {}
        };
        if (chars[0]) { config.sisterName = chars[0].name; config.sisterId = chars[0].id; }
        if (chars[1]) { config.brotherName = chars[1].name; config.brotherId = chars[1].id; }

        var scenes = Canvas.nodes.filter(function(n) { return n.type === 'scene'; }).map(function(n) {
            var scene = {
                id: n.id, subtitle: n.subtitle || '', text: n.text || '',
                choices: (n.choices || []).map(function(ch, i) {
                    var conn = Canvas.connections.find(function(c) { return c.fromNodeId === n.id && c.fromChoiceIndex === i; });
                    var obj = { text: ch.text || '', next: conn ? conn.toNodeId : '' };
                    (p.config.stats || []).forEach(function(s) { obj[s.id] = ch[s.id] || 0; });
                    if (ch.sex) obj.sex = true;
                    if (ch.corrupt) obj.corrupt = true;
                    chars.forEach(function(c) {
                        if (ch['strip_' + c.id]) obj['strip_' + c.id] = ch['strip_' + c.id];
                        if (ch['wear_' + c.id]) obj['wear_' + c.id] = ch['wear_' + c.id];
                        if (ch['state_' + c.id]) obj['state_' + c.id] = ch['state_' + c.id];
                        if (ch['enslave_' + c.id]) obj['enslave_' + c.id] = true;
                        if (c.bodyParts) {
                            Object.keys(c.bodyParts).forEach(function(bpKey) {
                                var val = ch['act_' + bpKey + '_' + c.id];
                                if (val) obj['act_' + bpKey + '_' + c.id] = val;
                            });
                        }
                    });
                    if (chars[0]) {
                        if (ch['strip_' + chars[0].id]) obj.sis = ch['strip_' + chars[0].id];
                        if (ch['wear_' + chars[0].id]) obj.wearSis = ch['wear_' + chars[0].id];
                        if (ch['act_oral_' + chars[0].id]) obj.mayaOral = ch['act_oral_' + chars[0].id];
                        if (ch['act_vaginal_' + chars[0].id]) obj.mayaVaginal = ch['act_vaginal_' + chars[0].id];
                        if (ch['act_anal_' + chars[0].id]) obj.mayaAnal = ch['act_anal_' + chars[0].id];
                        if (ch['enslave_' + chars[0].id]) obj.enslaveSis = true;
                    }
                    if (chars[1]) {
                        if (ch['strip_' + chars[1].id]) obj.bro = ch['strip_' + chars[1].id];
                        if (ch['wear_' + chars[1].id]) obj.wearBro = ch['wear_' + chars[1].id];
                        if (ch['act_oral_' + chars[1].id]) obj.leoOral = ch['act_oral_' + chars[1].id];
                        if (ch['act_anal_' + chars[1].id]) obj.leoAnal = ch['act_anal_' + chars[1].id];
                        if (ch['enslave_' + chars[1].id]) obj.enslaveBro = true;
                    }
                    Object.keys(n.extraTags || {}).forEach(function(k) { obj[k] = n.extraTags[k]; });
                    return obj;
                })
            };
            Object.keys(n.extraTags || {}).forEach(function(k) { scene[k] = n.extraTags[k]; });
            return scene;
        });

        var endings = {};
        Canvas.nodes.filter(function(n) { return n.type === 'ending'; }).forEach(function(n) {
            endings[n.id] = { emoji: n.emoji || '⭐', title: n.title, desc: n.text, color: n.color || '#880030' };
        });

        var result = { config: config, scenes: scenes, endings: endings };
        result.images = ImageManager.exportForProject(p.id);
        return result;
    },

    exportJS: function() {
        var data = this.buildData(); if (!data) return;
        var out = '// ============ STORY CONFIG ============\nvar STORY_CONFIG = ' + JSON.stringify(data.config, null, 4) + ';\n\n';
        out += '// ============ STORY SCENES ============\nvar STORY_SCENES = ' + JSON.stringify(data.scenes, null, 4) + ';\n\n';
        out += '// ============ STORY ENDINGS ============\nvar STORY_ENDINGS = ' + JSON.stringify(data.endings, null, 4) + ';\n';
        out += '// ============ IMAGES ============\nvar STORY_IMAGES = ' + JSON.stringify(data.images, null, 4) + ';\n';

        var blob = new Blob([out], { type: 'text/javascript' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'story.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 100);
        Utils.showSaveIndicator();
    },

    exportHTML: function() {
        var data = this.buildData(); if (!data) return;
        var jsContent = 'var STORY_CONFIG = ' + JSON.stringify(data.config) + ';\n';
        jsContent += 'var STORY_SCENES = ' + JSON.stringify(data.scenes) + ';\n';
        jsContent += 'var STORY_ENDINGS = ' + JSON.stringify(data.endings) + ';\n';
        jsContent += 'var STORY_IMAGES = ' + JSON.stringify(data.images || {}) + ';\n';

        var engineHTML = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + Utils.escHtml(data.config.title) + '</title>\n<style>\n' +
            ':root{--bg:#0a0a14;--surface:#14142a;--text:#c8c8e0;--dim:#8888aa;--accent:#e04080;}\n' +
            '*{margin:0;padding:0;box-sizing:border-box;}\n' +
            'body{background:var(--bg);color:var(--text);font-family:sans-serif;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:10px;}\n' +
            '#game{max-width:700px;width:100%;padding:20px;background:var(--surface);border-radius:12px;margin-top:10px;}\n' +
            'h1{color:var(--accent);text-align:center;font-size:1.3em;}\n' +
            '#sub{color:var(--dim);font-style:italic;text-align:center;font-size:0.85em;margin-bottom:10px;}\n' +
            '#main-row{display:flex;gap:15px;flex-wrap:wrap;}\n' +
            '#image-panel{flex:0 0 200px;display:flex;flex-direction:column;align-items:center;gap:8px;}\n' +
            '#char-selector{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}\n' +
            '#char-selector button{padding:4px 10px;background:#1a1a34;color:var(--text);border:1px solid #2a2a44;border-radius:4px;cursor:pointer;font-size:0.75em;}\n' +
            '#char-selector button.active{background:var(--accent);border-color:var(--accent);}\n' +
            '#image-container{position:relative;width:200px;height:300px;background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;border:1px solid #2a2a44;}\n' +
            '#image-container img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;}\n' +
            '#image-container .no-image{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--dim);font-size:3em;}\n' +
            '#clothing-indicator{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;font-size:0.7em;color:var(--dim);}\n' +
            '#clothing-indicator .cloth-tag{padding:2px 6px;border-radius:3px;font-size:0.7em;}\n' +
            '#clothing-indicator .cloth-on{background:rgba(46,204,113,0.2);color:#2ecc71;}\n' +
            '#clothing-indicator .cloth-off{background:rgba(255,48,80,0.2);color:#ff3050;text-decoration:line-through;}\n' +
            '#story-panel{flex:1;min-width:250px;}\n' +
            '#txt{line-height:1.6;margin:10px 0;font-style:italic;font-size:0.9em;}\n' +
            '#choices-area{display:flex;flex-direction:column;gap:6px;}\n' +
            '#choices-area button{display:block;width:100%;padding:10px;background:#1a1a34;color:var(--text);border:1px solid #2a2a44;border-radius:6px;cursor:pointer;text-align:left;font-size:0.85em;transition:all 0.15s;}\n' +
            '#choices-area button:hover{background:#2a2a44;border-color:var(--accent);}\n' +
            '#endScreen{display:none;text-align:center;padding:20px;}\n' +
            '#endScreen h2{color:var(--accent);}\n' +
            '#endScreen p{color:var(--text);line-height:1.6;margin:10px 0;}\n' +
            '#endScreen button{text-align:center;background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:1em;margin-top:10px;}\n' +
            '@media(max-width:500px){#main-row{flex-direction:column;}#image-panel{flex:0 0 auto;}#image-container{width:150px;height:225px;}}\n' +
            '</style>\n</head><body>\n' +
            '<div id="game"><h1>' + Utils.escHtml(data.config.title) + '</h1><p id="sub">' + Utils.escHtml(data.config.subtitle) + '</p>\n' +
            '<div id="main-row">\n' +
            '<div id="image-panel">\n' +
            '<div id="char-selector"></div>\n' +
            '<div id="image-container"><div class="no-image">🧑</div></div>\n' +
            '<div id="clothing-indicator"></div>\n' +
            '</div>\n' +
            '<div id="story-panel"><p id="txt"></p><div id="choices-area"></div></div>\n' +
            '</div></div>\n' +
            '<div id="endScreen"><h2 id="endTitle"></h2><p id="endDesc"></p><button onclick="location.reload()">Play Again</button></div>\n';

        engineHTML += '<script>\n' + jsContent + '\n' +
            'var currentCharIndex=0;\n' +
            'var characterClothing={};\n' +
            'var characters=STORY_CONFIG.characters||[];\n' +
            'var images=STORY_IMAGES||{};\n' +
            'function initClothing(){characters.forEach(function(c){characterClothing[c.id]={};(c.clothing||[]).forEach(function(cloth){characterClothing[c.id][cloth]=true;});});}\n' +
            'function buildCharSelector(){var sel=document.getElementById("char-selector");sel.innerHTML="";characters.forEach(function(c,i){var btn=document.createElement("button");btn.textContent=(c.icon||"🧑")+" "+c.name;if(i===currentCharIndex)btn.classList.add("active");btn.onclick=function(){currentCharIndex=i;updateImage();};sel.appendChild(btn);});}\n' +
            'function updateImage(){var c=characters[currentCharIndex];var ic=document.getElementById("image-container");var ci=document.getElementById("clothing-indicator");if(!c){ic.innerHTML=\'<div class="no-image">🧑</div>\';ci.innerHTML="";return;}var cimgs=(images&&images[c.id])||{base:null,clothing:{}};ic.innerHTML="";var has=false;if(cimgs.base){var img=document.createElement("img");img.src=cimgs.base;img.style.zIndex="1";ic.appendChild(img);has=true;}var cs=characterClothing[c.id]||{};(c.clothing||[]).forEach(function(cn,ci){if(cs[cn]&&cimgs.clothing&&cimgs.clothing[cn]){var cimg=document.createElement("img");cimg.src=cimgs.clothing[cn];cimg.style.zIndex=(2+ci);ic.appendChild(cimg);has=true;}});if(!has)ic.innerHTML=\'<div class="no-image">\'+(c.icon||"🧑")+\'</div>\';ci.innerHTML="";(c.clothing||[]).forEach(function(cn){var tag=document.createElement("span");tag.className="cloth-tag "+(cs[cn]?"cloth-on":"cloth-off");tag.textContent=(cs[cn]?"✅":"❌")+" "+cn;ci.appendChild(tag);});}\n' +
            'function applyClothing(charId,stripList,wearList){if(stripList&&stripList!=="none"){var items=stripList.split(",");items.forEach(function(item){if(characterClothing[charId])characterClothing[charId][item]=false;});}if(wearList&&wearList!=="none"){var items=wearList.split(",");items.forEach(function(item){if(characterClothing[charId])characterClothing[charId][item]=true;});}updateImage();}\n' +
            'function show(id){var s=STORY_SCENES.find(function(x){return x.id===id});if(!s){if(STORY_ENDINGS[id]){document.getElementById("game").style.display="none";document.getElementById("endScreen").style.display="block";document.getElementById("endTitle").textContent=STORY_ENDINGS[id].title;document.getElementById("endDesc").textContent=STORY_ENDINGS[id].desc;return;}alert("Scene: "+id+" not found");return;}document.getElementById("txt").textContent=s.text;if(s.subtitle)document.getElementById("sub").textContent=s.subtitle;var ca=document.getElementById("choices-area");ca.innerHTML="";s.choices.forEach(function(ch){var b=document.createElement("button");b.textContent=ch.text;b.onclick=function(){characters.forEach(function(c){applyClothing(c.id,ch["strip_"+c.id],ch["wear_"+c.id]);});show(ch.next);};ca.appendChild(b);});}\n' +
            'initClothing();buildCharSelector();updateImage();show(STORY_SCENES[0].id);\n' +
            '<' + '/script></body></html>';

        var blob = new Blob([engineHTML], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = data.config.title.replace(/\s/g, '_') + '_engine.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 100);
        Utils.showSaveIndicator();
    },

    previewHTML: function() {
        var data = this.buildData(); if (!data) return;
        var jsContent = 'var STORY_CONFIG = ' + JSON.stringify(data.config) + ';\n';
        jsContent += 'var STORY_SCENES = ' + JSON.stringify(data.scenes) + ';\n';
        jsContent += 'var STORY_ENDINGS = ' + JSON.stringify(data.endings) + ';\n';
        jsContent += 'var STORY_IMAGES = ' + JSON.stringify(data.images || {}) + ';\n';

        var engineHTML = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>🔍 Preview: ' + Utils.escHtml(data.config.title) + '</title>\n<style>\n' +
            ':root{--bg:#0a0a14;--surface:#14142a;--text:#c8c8e0;--dim:#8888aa;--accent:#e04080;}\n' +
            '*{margin:0;padding:0;box-sizing:border-box;}\n' +
            'body{background:var(--bg);color:var(--text);font-family:sans-serif;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:10px;}\n' +
            '#preview-banner{position:fixed;top:0;left:0;right:0;background:rgba(240,192,64,0.95);color:#1a1a00;text-align:center;padding:4px;font-size:0.7em;font-weight:700;z-index:999;}\n' +
            '#game{max-width:700px;width:100%;padding:20px;background:var(--surface);border-radius:12px;margin-top:25px;}\n' +
            'h1{color:var(--accent);text-align:center;font-size:1.3em;}\n' +
            '#sub{color:var(--dim);font-style:italic;text-align:center;font-size:0.85em;margin-bottom:10px;}\n' +
            '#main-row{display:flex;gap:15px;flex-wrap:wrap;}\n' +
            '#image-panel{flex:0 0 200px;display:flex;flex-direction:column;align-items:center;gap:8px;}\n' +
            '#char-selector{display:flex;gap:4px;flex-wrap:wrap;justify-content:center;}\n' +
            '#char-selector button{padding:4px 10px;background:#1a1a34;color:var(--text);border:1px solid #2a2a44;border-radius:4px;cursor:pointer;font-size:0.75em;}\n' +
            '#char-selector button.active{background:var(--accent);border-color:var(--accent);}\n' +
            '#image-container{position:relative;width:200px;height:300px;background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;border:1px solid #2a2a44;}\n' +
            '#image-container img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;}\n' +
            '#image-container .no-image{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--dim);font-size:3em;}\n' +
            '#clothing-indicator{display:flex;flex-wrap:wrap;gap:3px;justify-content:center;font-size:0.7em;color:var(--dim);}\n' +
            '#clothing-indicator .cloth-tag{padding:2px 6px;border-radius:3px;font-size:0.7em;}\n' +
            '#clothing-indicator .cloth-on{background:rgba(46,204,113,0.2);color:#2ecc71;}\n' +
            '#clothing-indicator .cloth-off{background:rgba(255,48,80,0.2);color:#ff3050;text-decoration:line-through;}\n' +
            '#story-panel{flex:1;min-width:250px;}\n' +
            '#txt{line-height:1.6;margin:10px 0;font-style:italic;font-size:0.9em;}\n' +
            '#choices-area{display:flex;flex-direction:column;gap:6px;}\n' +
            '#choices-area button{display:block;width:100%;padding:10px;background:#1a1a34;color:var(--text);border:1px solid #2a2a44;border-radius:6px;cursor:pointer;text-align:left;font-size:0.85em;transition:all 0.15s;}\n' +
            '#choices-area button:hover{background:#2a2a44;border-color:var(--accent);}\n' +
            '#endScreen{display:none;text-align:center;padding:20px;}\n' +
            '#endScreen h2{color:var(--accent);}\n' +
            '#endScreen p{color:var(--text);line-height:1.6;margin:10px 0;}\n' +
            '#endScreen button{text-align:center;background:var(--accent);color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:1em;margin-top:10px;}\n' +
            '@media(max-width:500px){#main-row{flex-direction:column;}#image-panel{flex:0 0 auto;}#image-container{width:150px;height:225px;}}\n' +
            '</style>\n</head><body>\n' +
            '<div id="preview-banner">🔍 PREVIEW MODE — Close this tab to return to the editor</div>\n' +
            '<div id="game"><h1>' + Utils.escHtml(data.config.title) + '</h1><p id="sub">' + Utils.escHtml(data.config.subtitle) + '</p>\n' +
            '<div id="main-row">\n' +
            '<div id="image-panel">\n' +
            '<div id="char-selector"></div>\n' +
            '<div id="image-container"><div class="no-image">🧑</div></div>\n' +
            '<div id="clothing-indicator"></div>\n' +
            '</div>\n' +
            '<div id="story-panel"><p id="txt"></p><div id="choices-area"></div></div>\n' +
            '</div></div>\n' +
            '<div id="endScreen"><h2 id="endTitle"></h2><p id="endDesc"></p><button onclick="location.reload()">Play Again</button></div>\n';

        engineHTML += '<script>\n' + jsContent + '\n' +
            'var currentCharIndex=0;\n' +
            'var characterClothing={};\n' +
            'var characters=STORY_CONFIG.characters||[];\n' +
            'var images=STORY_IMAGES||{};\n' +
            'function initClothing(){characters.forEach(function(c){characterClothing[c.id]={};(c.clothing||[]).forEach(function(cloth){characterClothing[c.id][cloth]=true;});});}\n' +
            'function buildCharSelector(){var sel=document.getElementById("char-selector");sel.innerHTML="";characters.forEach(function(c,i){var btn=document.createElement("button");btn.textContent=(c.icon||"🧑")+" "+c.name;if(i===currentCharIndex)btn.classList.add("active");btn.onclick=function(){currentCharIndex=i;updateImage();};sel.appendChild(btn);});}\n' +
            'function updateImage(){var c=characters[currentCharIndex];var ic=document.getElementById("image-container");var ci=document.getElementById("clothing-indicator");if(!c){ic.innerHTML=\'<div class="no-image">🧑</div>\';ci.innerHTML="";return;}var cimgs=(images&&images[c.id])||{base:null,clothing:{}};ic.innerHTML="";var has=false;if(cimgs.base){var img=document.createElement("img");img.src=cimgs.base;img.style.zIndex="1";ic.appendChild(img);has=true;}var cs=characterClothing[c.id]||{};(c.clothing||[]).forEach(function(cn,ci){if(cs[cn]&&cimgs.clothing&&cimgs.clothing[cn]){var cimg=document.createElement("img");cimg.src=cimgs.clothing[cn];cimg.style.zIndex=(2+ci);ic.appendChild(cimg);has=true;}});if(!has)ic.innerHTML=\'<div class="no-image">\'+(c.icon||"🧑")+\'</div>\';ci.innerHTML="";(c.clothing||[]).forEach(function(cn){var tag=document.createElement("span");tag.className="cloth-tag "+(cs[cn]?"cloth-on":"cloth-off");tag.textContent=(cs[cn]?"✅":"❌")+" "+cn;ci.appendChild(tag);});}\n' +
            'function applyClothing(charId,stripList,wearList){if(stripList&&stripList!=="none"){var items=stripList.split(",");items.forEach(function(item){if(characterClothing[charId])characterClothing[charId][item]=false;});}if(wearList&&wearList!=="none"){var items=wearList.split(",");items.forEach(function(item){if(characterClothing[charId])characterClothing[charId][item]=true;});}updateImage();}\n' +
            'function show(id){var s=STORY_SCENES.find(function(x){return x.id===id});if(!s){if(STORY_ENDINGS[id]){document.getElementById("game").style.display="none";document.getElementById("endScreen").style.display="block";document.getElementById("endTitle").textContent=STORY_ENDINGS[id].title;document.getElementById("endDesc").textContent=STORY_ENDINGS[id].desc;return;}alert("Scene: "+id+" not found");return;}document.getElementById("txt").textContent=s.text;if(s.subtitle)document.getElementById("sub").textContent=s.subtitle;var ca=document.getElementById("choices-area");ca.innerHTML="";s.choices.forEach(function(ch){var b=document.createElement("button");b.textContent=ch.text;b.onclick=function(){characters.forEach(function(c){applyClothing(c.id,ch["strip_"+c.id],ch["wear_"+c.id]);});show(ch.next);};ca.appendChild(b);});}\n' +
            'initClothing();buildCharSelector();updateImage();show(STORY_SCENES[0].id);\n' +
            '<' + '/script></body></html>';

        var blob = new Blob([engineHTML], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var previewWindow = window.open(url, '_blank');
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
        if (!previewWindow) {
            alert('⚠️ Pop-up blocked!\n\nPlease allow pop-ups for this site to use the preview feature.');
        }
    }
};