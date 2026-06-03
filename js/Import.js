var Import = {
    importJS: function(event) {
        var file = event.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var code = e.target.result;
                var scenesMatch = code.match(/STORY_SCENES\s*=\s*(\[[\s\S]*?\]);/);
                var endingsMatch = code.match(/STORY_ENDINGS\s*=\s*(\{[\s\S]*?\});/);
                if (!scenesMatch) { alert('Could not find STORY_SCENES in file.'); return; }
                var scenes = JSON.parse(scenesMatch[1]);
                var endings = endingsMatch ? JSON.parse(endingsMatch[1]) : {};
                var p = ProjectManager.createProject('Imported Story');
                var chars = p.config.characters || [];
                Canvas.nodes = []; Canvas.connections = []; Canvas.nodeIdCounter = 0;
                scenes.forEach(function(s, si) {
                    var node = {
                        id: s.id, type: 'scene', x: 150 + (si % 3) * 350, y: 100 + Math.floor(si / 3) * 350,
                        title: s.id, subtitle: s.subtitle || '', text: s.text || '',
                        choices: (s.choices || []).map(function(ch) {
                            var choice = { text: ch.text || '' };
                            (p.config.stats || []).forEach(function(st) { choice[st.id] = ch[st.id] || 0; });
                            choice.sex = ch.sex || false; choice.corrupt = ch.corrupt || false;
                            // Import legacy fields into new character format
                            if (chars[0]) {
                                if (ch.sis) choice['strip_' + chars[0].id] = ch.sis;
                                if (ch.mayaOral) choice['act_oral_' + chars[0].id] = ch.mayaOral;
                                if (ch.mayaVaginal) choice['act_vaginal_' + chars[0].id] = ch.mayaVaginal;
                                if (ch.mayaAnal) choice['act_anal_' + chars[0].id] = ch.mayaAnal;
                                if (ch.enslaveSis) choice['enslave_' + chars[0].id] = true;
                                // Generic body parts
                                chars.forEach(function(c) {
                                    Object.keys(ch).forEach(function(k) {
                                        if (k.startsWith('act_') && k.endsWith('_' + c.id)) choice[k] = ch[k];
                                        if (k.startsWith('strip_') && k.endsWith('_' + c.id)) choice[k] = ch[k];
                                        if (k.startsWith('state_') && k.endsWith('_' + c.id)) choice[k] = ch[k];
                                        if (k.startsWith('enslave_') && k.endsWith('_' + c.id)) choice[k] = ch[k];
                                    });
                                });
                            }
                            if (chars[1]) {
                                if (ch.bro) choice['strip_' + chars[1].id] = ch.bro;
                                if (ch.leoOral) choice['act_oral_' + chars[1].id] = ch.leoOral;
                                if (ch.leoAnal) choice['act_anal_' + chars[1].id] = ch.leoAnal;
                                if (ch.enslaveBro) choice['enslave_' + chars[1].id] = true;
                            }
                            return choice;
                        }),
                        extraTags: {}
                    };
                    Canvas.nodes.push(node); Canvas.nodeIdCounter++;
                });
                Object.keys(endings).forEach(function(id, ei) {
                    var e = endings[id];
                    Canvas.nodes.push({
                        id: id, type: 'ending', x: 600 + (ei % 3) * 300, y: 100 + ei * 250,
                        title: e.title || id, emoji: e.emoji || '⭐', text: e.desc || '', color: e.color || '#880030'
                    });
                });
                scenes.forEach(function(s) {
                    (s.choices || []).forEach(function(ch, ci) {
                        if (ch.next && Canvas.nodes.find(function(n) { return n.id === ch.next; })) {
                            Canvas.connections.push({ fromNodeId: s.id, fromChoiceIndex: ci, toNodeId: ch.next });
                        }
                    });
                });
                Canvas.nodes.forEach(function(n) { Canvas.renderNode(n); });
                Canvas.drawConnections(); Canvas.saveState();
                App.loadProjectToEditor(); Utils.showSaveIndicator();
            } catch (err) { alert('Parse error: ' + err.message); }
        };
        reader.readAsText(file); event.target.value = '';
    }
};