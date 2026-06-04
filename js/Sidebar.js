var Sidebar = {
    render: function() {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        if (!Canvas.selectedNodeId) {
            sidebar.innerHTML = '<div style="color:var(--dim);text-align:center;padding:20px;">👈 Select a node<br>to edit properties</div>';
            return;
        }
        var node = Canvas.getNode(Canvas.selectedNodeId);
        if (!node) { sidebar.innerHTML = '<div>Node not found</div>'; return; }
        var p = ProjectManager.getActive();
        var chars = p ? (p.config.characters || []) : [];
        var stats = p ? (p.config.stats || []) : [];

        var html = '<h3>' + (node.type === 'scene' ? '🎬' : '🏁') + ' ' + Utils.escHtml(node.title) + '</h3>';
        html += '<label>ID</label><input value="' + node.id + '" readonly style="opacity:0.5;">';
        html += '<label>Title</label><input value="' + Utils.escHtml(node.title) + '" onchange="NodeEditor.updateNodeProp(\'title\',this.value)">';

        if (node.type === 'scene') {
            html += '<label>Subtitle</label><input value="' + Utils.escHtml(node.subtitle || '') + '" onchange="NodeEditor.updateNodeProp(\'subtitle\',this.value)">';
            html += '<label>Text</label><textarea onchange="NodeEditor.updateNodeProp(\'text\',this.value)">' + Utils.escHtml(node.text || '') + '</textarea>';

            // Character visibility toggle
            html += '<h3>👁️ Visible Characters</h3>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">';
            var hiddenChars = node.hiddenChars ? node.hiddenChars.split(',') : [];
            chars.forEach(function(c) {
                var isVisible = hiddenChars.indexOf(c.id) < 0;
                html += '<label style="font-size:9px;display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.25);padding:3px 8px;border-radius:4px;cursor:pointer;">';
                html += '<input type="checkbox" ' + (isVisible ? 'checked' : '') + ' onchange="Sidebar.toggleCharVisibility(\'' + node.id + '\',\'' + c.id + '\',this.checked)" style="width:auto;">';
                html += (c.icon || '🧑') + ' ' + Utils.escHtml(c.name);
                html += '</label>';
            });
            html += '</div>';

            // Scene default pose/expression per character
            html += '<h3>🎭 Pose & Expression</h3>';
            html += '<div style="font-size:8px;color:var(--dim);margin-bottom:4px;">Set pose/expression for this scene, or follow previous scene.</div>';
            chars.forEach(function(c) {
                html += '<div style="display:flex;gap:4px;align-items:center;margin:2px 0;font-size:9px;background:rgba(0,0,0,0.2);padding:4px 6px;border-radius:4px;">';
                html += '<span style="min-width:45px;font-weight:700;">' + Utils.escHtml(c.name) + '</span>';
                
                html += '<select onchange="NodeEditor.updateNodeProp(\'pose_' + c.id + '\',this.value)" style="font-size:9px;flex:1;">';
                html += '<option value=""' + (!node['pose_'+c.id]?' selected':'') + '>↻ follow prev</option>';
                (c.poses||['default']).forEach(function(p) {
                    html += '<option value="' + p + '"' + (node['pose_'+c.id]===p?' selected':'') + '>' + p + '</option>';
                });
                html += '</select>';
                
                html += '<select onchange="NodeEditor.updateNodeProp(\'expr_' + c.id + '\',this.value)" style="font-size:9px;flex:1;">';
                html += '<option value=""' + (!node['expr_'+c.id]?' selected':'') + '>↻ follow prev</option>';
                (c.expressions||['neutral']).forEach(function(e) {
                    html += '<option value="' + e + '"' + (node['expr_'+c.id]===e?' selected':'') + '>' + e + '</option>';
                });
                html += '</select>';
                
                html += '</div>';
            });

            html += '<h3>Choices <button class="btn-sm-add" onclick="NodeEditor.addChoice(\'' + node.id + '\');Sidebar.render();">+</button></h3>';

            if (node.choices) {
                node.choices.forEach(function(ch, i) {
                    var conn = Canvas.connections.find(function(c) { return c.fromNodeId === node.id && c.fromChoiceIndex === i; });
                    var nextNode = conn ? Canvas.getNode(conn.toNodeId) : null;
                    html += '<div style="background:rgba(0,0,0,0.3);padding:6px;border-radius:5px;margin:4px 0;">';
                    html += '<strong>Choice ' + (i + 1) + '</strong> → ' + (nextNode ? Utils.escHtml(nextNode.title) : '<span style="color:var(--dim);">unconnected</span>');
                    html += '<button class="btn-sm-remove" style="float:right;" onclick="NodeEditor.deleteChoice(\'' + node.id + '\',' + i + ');Sidebar.render();">✕</button>';
                    html += '<label>Text</label><input value="' + Utils.escHtml(ch.text || '') + '" onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'text\',this.value)">';

                    // Stats
                    html += '<div class="stat-row">';
                    stats.forEach(function(s) {
                        html += '<label>' + s.emoji + ' ' + s.name + '</label><input type="number" value="' + (ch[s.id] || 0) + '" onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'' + s.id + '\',parseInt(this.value)||0)">';
                    });
                    html += '</div>';

                    // Flags
                    html += '<div class="checkbox-row">';
                    html += '<label><input type="checkbox" ' + (ch.sex ? 'checked' : '') + ' onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'sex\',this.checked)">🔞Sex</label>';
                    html += '<label><input type="checkbox" ' + (ch.corrupt ? 'checked' : '') + ' onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'corrupt\',this.checked)">Corrupt</label>';
                    html += '</div>';

                    // Sex acts — per character, per body part
                    if (p && p.config.extraSettings && p.config.extraSettings.enableSexActs) {
                        chars.forEach(function(c) {
                            if (c.bodyParts) {
                                Object.keys(c.bodyParts).forEach(function(bpKey) {
                                    var bp = c.bodyParts[bpKey];
                                    if (bp.enabled) {
                                        html += '<div class="stat-row">';
                                        html += '<label>' + (bp.icon||'') + ' ' + Utils.escHtml(bp.label||bpKey) + ' (' + Utils.escHtml(c.name) + ')</label>';
                                        html += '<input type="number" value="' + (ch['act_' + bpKey + '_' + c.id] || 0) + '" onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'act_' + bpKey + '_' + c.id + '\',parseInt(this.value)||0)" style="width:40px;">';
                                        html += '</div>';
                                    }
                                });
                            }
                        });
                    }

                    // Per-character: clothing toggle (strip / wear)
                    chars.forEach(function(c) {
                        html += '<div style="margin-top:4px;">';
                        html += '<label style="min-width:100%;margin-bottom:2px;">' + Utils.escHtml(c.name) + ' clothing</label>';
                        html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
                        (c.clothing || []).forEach(function(l) {
                            var strippedItems = ch['strip_' + c.id] ? ch['strip_' + c.id].split(',') : [];
                            var wornItems = ch['wear_' + c.id] ? ch['wear_' + c.id].split(',') : [];
                            var isStripped = strippedItems.indexOf(l) >= 0;
                            var isWorn = wornItems.indexOf(l) >= 0;

                            html += '<div style="display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.25);padding:3px 6px;border-radius:4px;">';
                            html += '<span style="font-size:9px;min-width:40px;">' + l + '</span>';

                            html += '<button onclick="Sidebar.toggleClothingAction(\'' + node.id + '\',' + i + ',\'' + c.id + '\',\'' + l + '\',\'strip\')" ';
                            html += 'style="padding:2px 6px;border-radius:3px;font-size:8px;font-weight:700;cursor:pointer;border:1px solid ' + (isStripped ? '#ff3050' : '#3a3a55') + ';background:' + (isStripped ? 'rgba(255,48,80,0.3)' : 'transparent') + ';color:' + (isStripped ? '#ff6080' : 'var(--dim)') + ';" ';
                            html += 'title="Remove this clothing">− Strip</button>';

                            html += '<button onclick="Sidebar.toggleClothingAction(\'' + node.id + '\',' + i + ',\'' + c.id + '\',\'' + l + '\',\'wear\')" ';
                            html += 'style="padding:2px 6px;border-radius:3px;font-size:8px;font-weight:700;cursor:pointer;border:1px solid ' + (isWorn ? '#2ecc71' : '#3a3a55') + ';background:' + (isWorn ? 'rgba(46,204,113,0.3)' : 'transparent') + ';color:' + (isWorn ? '#2ecc71' : 'var(--dim)') + ';" ';
                            html += 'title="Put this clothing back on">+ Wear</button>';

                            html += '</div>';
                        });
                        html += '</div></div>';
                    });

                    // Per-character: state
                    chars.forEach(function(c) {
                        html += '<div class="stat-row" style="margin-top:4px;">';
                        html += '<label>' + Utils.escHtml(c.name) + ' state</label>';
                        html += '<select onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'state_' + c.id + '\',this.value)">';
                        (c.states||['Normal']).forEach(function(s) {
                            html += '<option value="' + s + '"' + (ch['state_'+c.id]===s?' selected':'') + '>' + s + '</option>';
                        });
                        html += '</select>';
                        html += '</div>';
                    });

                    // Enslavement
                    if (p && p.config.extraSettings && p.config.extraSettings.enableEnslavement) {
                        html += '<div class="checkbox-row" style="margin-top:4px;">';
                        chars.forEach(function(c) {
                            html += '<label><input type="checkbox" ' + (ch['enslave_'+c.id]?'checked':'') + ' onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'enslave_'+c.id+'\',this.checked)">⛓️'+Utils.escHtml(c.name)+'</label>';
                        });
                        html += '</div>';
                    }

                    html += '</div>';
                });
            }
        } else {
            html += '<label>Emoji <button class="btn-sm-edit emoji-trigger" onclick="EmojiPicker.open(\'endingEmojiInput\',event)">Pick</button></label>';
            html += '<input id="endingEmojiInput" value="' + (node.emoji||'⭐') + '" onchange="NodeEditor.updateNodeProp(\'emoji\',this.value)">';
            html += '<label>Color</label><input type="color" value="' + (node.color||'#880030') + '" onchange="NodeEditor.updateNodeProp(\'color\',this.value)" style="height:28px;">';
            html += '<label>Text</label><textarea onchange="NodeEditor.updateNodeProp(\'text\',this.value)">' + Utils.escHtml(node.text||'') + '</textarea>';
        }

        sidebar.innerHTML = html;
    },

    toggleClothingAction: function(nodeId, choiceIndex, charId, clothItem, action) {
        var node = Canvas.getNode(nodeId);
        if (!node || !node.choices || !node.choices[choiceIndex]) return;
        var ch = node.choices[choiceIndex];

        var stripKey = 'strip_' + charId;
        var wearKey = 'wear_' + charId;

        var strippedItems = ch[stripKey] ? ch[stripKey].split(',') : [];
        var wornItems = ch[wearKey] ? ch[wearKey].split(',') : [];

        if (action === 'strip') {
            var idx = strippedItems.indexOf(clothItem);
            if (idx >= 0) {
                strippedItems.splice(idx, 1);
            } else {
                strippedItems.push(clothItem);
                var wearIdx = wornItems.indexOf(clothItem);
                if (wearIdx >= 0) wornItems.splice(wearIdx, 1);
            }
        } else if (action === 'wear') {
            var idx = wornItems.indexOf(clothItem);
            if (idx >= 0) {
                wornItems.splice(idx, 1);
            } else {
                wornItems.push(clothItem);
                var stripIdx = strippedItems.indexOf(clothItem);
                if (stripIdx >= 0) strippedItems.splice(stripIdx, 1);
            }
        }

        ch[stripKey] = strippedItems.length > 0 ? strippedItems.join(',') : null;
        ch[wearKey] = wornItems.length > 0 ? wornItems.join(',') : null;

        Canvas.renderNode(node);
        Canvas.drawConnections();
        Canvas.saveState();
        this.render();
    },

    toggleCharVisibility: function(nodeId, charId, visible) {
        var node = Canvas.getNode(nodeId);
        if (!node) return;
        var hiddenChars = node.hiddenChars ? node.hiddenChars.split(',') : [];
        if (visible) {
            hiddenChars = hiddenChars.filter(function(id) { return id !== charId; });
        } else {
            if (hiddenChars.indexOf(charId) < 0) hiddenChars.push(charId);
        }
        node.hiddenChars = hiddenChars.length > 0 ? hiddenChars.join(',') : null;
        Canvas.renderNode(node);
        Canvas.drawConnections();
        Canvas.saveState();
        this.render();
    }
};