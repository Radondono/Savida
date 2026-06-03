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

                    // Per-character: strip + state
                    chars.forEach(function(c) {
                        html += '<div class="stat-row">';
                        html += '<label>' + Utils.escHtml(c.name) + ' strip</label>';
                        html += '<select onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'strip_' + c.id + '\',this.value===\'none\'?null:this.value)">';
                        html += '<option value="none">-</option>';
                        (c.clothing || ['top','bottom']).forEach(function(l) {
                            html += '<option value="' + l + '"' + (ch['strip_'+c.id]===l?' selected':'') + '>' + l + '</option>';
                        });
                        html += '</select>';
                        html += '<label>State</label>';
                        html += '<select onchange="NodeEditor.updateChoice(\'' + node.id + '\',' + i + ',\'state_' + c.id + '\',this.value)">';
                        (c.states||['Normal']).forEach(function(s) {
                            html += '<option value="' + s + '"' + (ch['state_'+c.id]===s?' selected':'') + '>' + s + '</option>';
                        });
                        html += '</select>';
                        html += '</div>';
                    });

                    // Enslavement
                    if (p && p.config.extraSettings && p.config.extraSettings.enableEnslavement) {
                        html += '<div class="checkbox-row">';
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
    }
};