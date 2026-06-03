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
        // Legacy names
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
                    // Character-specific fields
                    chars.forEach(function(c) {
                        if (ch['strip_' + c.id]) obj['strip_' + c.id] = ch['strip_' + c.id];
                        if (ch['state_' + c.id]) obj['state_' + c.id] = ch['state_' + c.id];
                        if (ch['enslave_' + c.id]) obj['enslave_' + c.id] = true;
                        // Body parts — use generic keys
                        if (c.bodyParts) {
                            Object.keys(c.bodyParts).forEach(function(bpKey) {
                                var val = ch['act_' + bpKey + '_' + c.id];
                                if (val) obj['act_' + bpKey + '_' + c.id] = val;
                            });
                        }
                    });
                    // Legacy compatibility
                    if (chars[0]) {
                        if (ch['strip_' + chars[0].id]) obj.sis = ch['strip_' + chars[0].id];
                        if (ch['act_oral_' + chars[0].id]) obj.mayaOral = ch['act_oral_' + chars[0].id];
                        if (ch['act_vaginal_' + chars[0].id]) obj.mayaVaginal = ch['act_vaginal_' + chars[0].id];
                        if (ch['act_anal_' + chars[0].id]) obj.mayaAnal = ch['act_anal_' + chars[0].id];
                        if (ch['enslave_' + chars[0].id]) obj.enslaveSis = true;
                    }
                    if (chars[1]) {
                        if (ch['strip_' + chars[1].id]) obj.bro = ch['strip_' + chars[1].id];
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
        return { config: config, scenes: scenes, endings: endings };
    },

    exportJS: function() {
        var data = this.buildData(); if (!data) return;
        var out = '// ============ STORY CONFIG ============\nvar STORY_CONFIG = ' + JSON.stringify(data.config, null, 4) + ';\n\n';
        out += '// ============ STORY SCENES ============\nvar STORY_SCENES = ' + JSON.stringify(data.scenes, null, 4) + ';\n\n';
        out += '// ============ STORY ENDINGS ============\nvar STORY_ENDINGS = ' + JSON.stringify(data.endings, null, 4) + ';\n';
        UI.showModal('Exported story.js', out, 'story.js', 'text/javascript');
    },

    exportHTML: function() {
        var data = this.buildData(); if (!data) return;
        var jsContent = 'var STORY_CONFIG = ' + JSON.stringify(data.config) + ';\nvar STORY_SCENES = ' + JSON.stringify(data.scenes) + ';\nvar STORY_ENDINGS = ' + JSON.stringify(data.endings) + ';\n';
        var engineHTML = '<!DOCTYPE html>\n<html><head><meta charset="UTF-8"><title>' + Utils.escHtml(data.config.title) + '</title>\n<style>\nbody{background:#0a0a14;color:#c8c8e0;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}\n#game{max-width:600px;width:90%;padding:20px;background:#14142a;border-radius:12px;}\nh1{color:#e04080;text-align:center;}\n#sub{color:#8888aa;font-style:italic;text-align:center;font-size:14px;}\n#txt{line-height:1.6;margin:15px 0;font-style:italic;}\nbutton{display:block;width:100%;margin:6px 0;padding:10px;background:#1a1a34;color:#c8c8e0;border:1px solid #2a2a44;border-radius:6px;cursor:pointer;text-align:left;font-size:14px;}\nbutton:hover{background:#2a2a44;border-color:#e04080;}\n#endScreen{display:none;text-align:center;}\n#endScreen h2{color:#e04080;}\n#endScreen button{text-align:center;background:#e04080;color:#fff;border:none;margin-top:15px;}\n</style>\n</head><body>\n<div id="game"><h1>' + Utils.escHtml(data.config.title) + '</h1><p id="sub">' + Utils.escHtml(data.config.subtitle) + '</p><p id="txt"></p><div id="choices"></div></div>\n<div id="endScreen"><h2 id="endTitle"></h2><p id="endDesc"></p><button onclick="location.reload()">Play Again</button></div>\n';
        engineHTML += '<script>\n' + jsContent + '\nvar txt=document.getElementById("txt"),choices=document.getElementById("choices"),sub=document.getElementById("sub");\nfunction show(id){var s=STORY_SCENES.find(function(x){return x.id===id});if(!s){if(STORY_ENDINGS[id]){document.getElementById("game").style.display="none";document.getElementById("endScreen").style.display="block";document.getElementById("endTitle").textContent=STORY_ENDINGS[id].title;document.getElementById("endDesc").textContent=STORY_ENDINGS[id].desc;return;}alert("Scene: "+id+" not found");return;}txt.textContent=s.text;if(s.subtitle)sub.textContent=s.subtitle;choices.innerHTML="";s.choices.forEach(function(ch){var b=document.createElement("button");b.textContent=ch.text;b.onclick=function(){show(ch.next);};choices.appendChild(b);});}\nshow(STORY_SCENES[0].id);\n';
        engineHTML += '<' + '/script></body></html>';
        UI.showModal('Exported Engine HTML', engineHTML, data.config.title.replace(/\s/g, '_') + '_engine.html', 'text/html');
    }
};