var LeftPanel = {
    render: function() {
        var p = ProjectManager.getActive();
        var container = document.getElementById('left-content');
        if (!container) return;
        if (!p) {
            container.innerHTML = '<div class="no-project-msg">📁<br>Create a project<br>to get started</div>';
            return;
        }

        var html = '';

        // Project Config
        html += '<h3>📋 Config</h3><div>';
        html += '<label>Title</label><input value="' + Utils.escHtml(p.config.title) + '" onchange="ProjectManager.updateConfig(\'title\',this.value)">';
        html += '<label>Subtitle</label><input value="' + Utils.escHtml(p.config.subtitle) + '" onchange="ProjectManager.updateConfig(\'subtitle\',this.value)">';
        html += '</div>';

        // Characters — cards that open modal editor
        html += '<h3>👥 Characters <button class="btn-sm-add" onclick="LeftPanel.addCharacter()">+</button></h3><div>';
        (p.config.characters || []).forEach(function(char, i) {
            var presetName = CharacterClasses.getDisplayName(char);
            var bpCount = char.bodyParts ? Object.keys(char.bodyParts).length : 0;
            var enabledBpCount = char.bodyParts ?
                Object.keys(char.bodyParts).filter(function(k) { return char.bodyParts[k].enabled; }).length : 0;
            html += '<div class="char-summary-card" onclick="CharacterEditor.open(' + i + ')">';
            html += '<div class="char-avatar">' + (char.icon || '🧑') + '</div>';
            html += '<div class="char-info">';
            html += '<div class="char-name">' + Utils.escHtml(char.name) + '</div>';
            html += '<div class="char-meta">';
            html += '<span>' + presetName + '</span>';
            html += '<span>' + (char.role || 'neutral') + '</span>';
            html += '<span>' + (char.clothing || []).length + ' 👔</span>';
            html += '<span>' + (char.states || []).length + ' 📊</span>';
            html += '<span>' + enabledBpCount + '/' + bpCount + ' 🫦</span>';
            html += '</div></div>';
            html += '<div class="char-arrow">▶</div>';
            html += '</div>';
        });
        html += '</div>';

        // Stats
        html += '<h3>📊 Stats <button class="btn-sm-add" onclick="LeftPanel.addStat()">+</button></h3><div>';
        (p.config.stats || []).forEach(function(stat, i) {
            html += '<div style="display:flex;gap:3px;align-items:center;margin:2px 0;background:rgba(0,0,0,0.25);padding:3px;border-radius:4px;">';
            html += '<input value="' + (stat.emoji || '') + '" id="statEmoji_' + i + '" onchange="LeftPanel.updateStat(' + i + ',\'emoji\',this.value)" style="width:35px;cursor:pointer;" class="emoji-trigger" onclick="EmojiPicker.open(\'statEmoji_' + i + '\',event)">';
            html += '<input value="' + Utils.escHtml(stat.name) + '" onchange="LeftPanel.updateStat(' + i + ',\'name\',this.value)" style="flex:1;">';
            html += '<input type="number" value="' + stat.start + '" onchange="LeftPanel.updateStat(' + i + ',\'start\',parseInt(this.value))" style="width:40px;" title="Start">';
            html += '<input type="color" value="' + (stat.color || '#8090e0') + '" onchange="LeftPanel.updateStat(' + i + ',\'color\',this.value)" style="width:28px;height:24px;padding:0;">';
            html += '<button class="btn-sm-remove" onclick="LeftPanel.removeStat(' + i + ')">✕</button></div>';
        });
        html += '</div>';

        // Settings
        html += '<h3>⚙️ Settings</h3><div>';
        html += '<label><input type="checkbox" ' + (p.config.extraSettings && p.config.extraSettings.enableSexActs ? 'checked' : '') + ' onchange="LeftPanel.updateSetting(\'enableSexActs\',this.checked)"> Enable Sex Acts</label>';
        html += '<label><input type="checkbox" ' + (p.config.extraSettings && p.config.extraSettings.enableEnslavement ? 'checked' : '') + ' onchange="LeftPanel.updateSetting(\'enableEnslavement\',this.checked)"> Enable Enslavement</label>';
        html += '</div>';

        container.innerHTML = html;
    },

    addCharacter: function() {
        var p = ProjectManager.getActive(); if (!p) return;
        p.config.characters.push(ProjectManager.createCharacter('New Character', 'standardGirl', 'neutral'));
        ProjectManager.saveToStorage();
        this.render();
        // Open the new character in editor
        CharacterEditor.open(p.config.characters.length - 1);
    },

    updateStat: function(i, key, value) {
        var p = ProjectManager.getActive(); if (!p || !p.config.stats[i]) return;
        p.config.stats[i][key] = value; ProjectManager.saveToStorage();
    },
    addStat: function() {
        var p = ProjectManager.getActive(); if (!p) return;
        p.config.stats.push({ id:'stat_'+Date.now(), name:'New Stat', emoji:'📊', start:0, min:0, max:100, color:'#8090e0' });
        ProjectManager.saveToStorage(); this.render();
    },
    removeStat: function(i) {
        var p = ProjectManager.getActive(); if (!p) return;
        p.config.stats.splice(i, 1); ProjectManager.saveToStorage(); this.render();
    },
    updateSetting: function(key, value) {
        var p = ProjectManager.getActive(); if (!p) return;
        if (!p.config.extraSettings) p.config.extraSettings = {};
        p.config.extraSettings[key] = value; ProjectManager.saveToStorage();
    },
    openClassEditor: function(editKey) {
        // Same modal class editor as before — kept for toolbar access
        var overlay = document.getElementById('modal-overlay');
        var modalTitle = document.getElementById('modal-title');
        var modalContent = document.getElementById('modal-content');
        var dlBtn = document.getElementById('modal-dl-btn');
        if (!overlay || !modalTitle || !modalContent) return;
        modalTitle.textContent = '🏗️ Class Preset Editor';
        dlBtn.style.display = 'none';
        var isEditing = !!editKey;
        var preset = isEditing ? CharacterClasses.getPreset(editKey) : null;
        var isBuiltIn = (editKey === 'standardGirl' || editKey === 'standardBoy');
        var html = '<div style="max-height:60vh;overflow-y:auto;">';
        html += '<label>Preset Key</label><input id="classEditorKey" value="' + (editKey||'') + '" ' + (isEditing?'readonly':'placeholder="e.g. warriorGirl"') + '>';
        html += '<label>Display Name</label><input id="classEditorName" value="' + (preset?Utils.escHtml(preset.name):'') + '">';
        html += '<label>Icon</label><input id="classEditorIcon" value="' + (preset?preset.icon:'🧑') + '" class="emoji-trigger" onclick="EmojiPicker.open(\'classEditorIcon\',event)">';
        html += '<label>Clothing (comma)</label><input id="classEditorClothing" value="' + (preset?preset.clothing.join(','):'top,bottom') + '">';
        html += '<label>States (comma)</label><input id="classEditorStates" value="' + (preset?preset.states.join(','):'Normal') + '">';
        html += '<label>Default State</label><input id="classEditorDefaultState" value="' + (preset?preset.defaultState:'Normal') + '">';
        html += '</div><div style="margin-top:10px;display:flex;gap:6px;">';
        if (isEditing && !isBuiltIn) html += '<button style="background:var(--danger);" onclick="LeftPanel.deleteClassPreset(\''+editKey+'\')">🗑️ Delete</button>';
        html += '<button style="background:var(--green);flex:1;" onclick="LeftPanel.saveClassPreset(\''+(editKey||'')+'\')">💾 Save</button>';
        html += '<button style="background:var(--border);" onclick="UI.closeModal()">Cancel</button></div>';
        html += '<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;"><strong style="font-size:11px;">Existing:</strong><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">';
        CharacterClasses.getPresetKeys().forEach(function(key) {
            var pr = CharacterClasses.getPreset(key);
            html += '<div style="background:rgba(0,0,0,0.3);padding:4px 8px;border-radius:4px;font-size:10px;cursor:pointer;" onclick="LeftPanel.openClassEditor(\''+key+'\')">'+(pr?pr.icon:'❓')+' '+Utils.escHtml(pr?pr.name:key)+'</div>';
        });
        html += '</div></div>';
        modalContent.innerHTML = html;
        overlay.classList.add('show');
    },
    saveClassPreset: function(originalKey) {
        var key = document.getElementById('classEditorKey').value.trim();
        var name = document.getElementById('classEditorName').value.trim();
        var icon = document.getElementById('classEditorIcon').value.trim();
        var clothing = document.getElementById('classEditorClothing').value.split(',').map(function(s){return s.trim();}).filter(function(s){return s;});
        var states = document.getElementById('classEditorStates').value.split(',').map(function(s){return s.trim();}).filter(function(s){return s;});
        var defaultState = document.getElementById('classEditorDefaultState').value.trim();
        if (!key||!name) { alert('Key and name required.'); return; }
        if (originalKey&&(originalKey==='standardGirl'||originalKey==='standardBoy')&&key!==originalKey) { alert('Cannot rename built-ins.'); return; }
        if (originalKey&&key!==originalKey) CharacterClasses.deletePreset(originalKey);
        var existing = originalKey ? CharacterClasses.getPreset(originalKey) : null;
        var bodyParts = existing ? JSON.parse(JSON.stringify(existing.bodyParts)) : {oral:{icon:'👄',label:'Oral',enabled:true}};
        CharacterClasses.savePreset(key,{name:name,icon:icon||'🧑',clothing:clothing,states:states,defaultState:defaultState,bodyParts:bodyParts});
        UI.closeModal(); this.render();
        if (typeof Sidebar !== 'undefined') Sidebar.render();
    },
    deleteClassPreset: function(key) {
        if (key==='standardGirl'||key==='standardBoy') { alert('Cannot delete built-ins.'); return; }
        if (!confirm('Delete preset "'+key+'"?')) return;
        var p = ProjectManager.getActive();
        if (p) { (p.config.characters||[]).forEach(function(c) { if (c.classPreset===key) c.classPreset='custom'; }); ProjectManager.saveToStorage(); }
        CharacterClasses.deletePreset(key);
        UI.closeModal(); this.render();
        if (typeof Sidebar !== 'undefined') Sidebar.render();
    }
};