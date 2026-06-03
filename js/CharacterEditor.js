var CharacterEditor = {
    currentCharIndex: -1,

    open: function(charIndex) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[charIndex]) return;
        this.currentCharIndex = charIndex;
        var char = p.config.characters[charIndex];

        var overlay = document.getElementById('modal-overlay');
        var modalTitle = document.getElementById('modal-title');
        var modalContent = document.getElementById('modal-content');
        var dlBtn = document.getElementById('modal-dl-btn');
        if (!overlay || !modalTitle || !modalContent) return;

        modalTitle.textContent = '🧑 Character Editor: ' + char.name;
        dlBtn.style.display = 'none';

        var isCustom = CharacterClasses.isCustom(char);
        var preset = char.classPreset ? CharacterClasses.getPreset(char.classPreset) : null;
        var bodyParts = char.bodyParts || {};

        var html = '<div style="max-height:60vh;overflow-y:auto;">';

        // ---- Basic Info ----
        html += '<h4 style="color:var(--accent);margin:8px 0 4px;">📋 Basic Info</h4>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<div style="flex:1;"><label>Name</label><input id="ceName" value="' + Utils.escHtml(char.name) + '"></div>';
        html += '<div style="flex:1;"><label>Role</label><select id="ceRole">';
        ['protagonist', 'companion', 'antagonist', 'neutral'].forEach(function(r) {
            html += '<option value="' + r + '"' + (char.role === r ? ' selected' : '') + '>' +
                    r.charAt(0).toUpperCase() + r.slice(1) + '</option>';
        });
        html += '</select></div></div>';

        // ---- Class ----
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🏗️ Class Preset</h4>';
        html += '<div style="display:flex;gap:6px;align-items:center;">';
        html += '<select id="ceClass" style="flex:1;" onchange="CharacterEditor.onClassChange()">';
        CharacterClasses.getPresetKeys().forEach(function(key) {
            var pr = CharacterClasses.getPreset(key);
            html += '<option value="' + key + '"' + (char.classPreset === key ? ' selected' : '') + '>' +
                    (pr ? pr.icon + ' ' + pr.name : key) + '</option>';
        });
        html += '<option value="custom"' + (isCustom ? ' selected' : '') + '>🧑 Custom</option>';
        html += '</select>';
        html += '<button class="btn-sm-edit" onclick="CharacterEditor.applyClassPreset()">Apply</button>';
        html += '</div>';

        if (!isCustom && preset) {
            html += '<div style="font-size:9px;color:var(--dim);margin-top:4px;">';
            html += 'Using preset: <strong>' + Utils.escHtml(preset.name) + '</strong> — ';
            html += 'Clothing: ' + preset.clothing.join(', ') + ' | ';
            html += 'States: ' + preset.states.join(', ');
            html += '</div>';
        }

        // ---- Clothing ----
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">👔 Clothing Items</h4>';
        html += '<div id="ceClothingList" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">';
        (char.clothing || []).forEach(function(item, ci) {
            html += '<div style="background:rgba(0,0,0,0.3);padding:3px 8px;border-radius:4px;display:flex;align-items:center;gap:4px;font-size:10px;">';
            html += '<span>' + Utils.escHtml(item) + '</span>';
            html += '<button class="btn-sm-remove" style="padding:1px 4px;font-size:8px;" onclick="CharacterEditor.removeClothing(' + ci + ')">✕</button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:4px;">';
        html += '<input id="ceNewClothing" placeholder="New clothing item..." style="flex:1;">';
        html += '<button class="btn-sm-add" onclick="CharacterEditor.addClothing()">+ Add</button>';
        html += '</div>';

        // ---- States ----
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">📊 States</h4>';
        html += '<div id="ceStatesList" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">';
        (char.states || []).forEach(function(state, si) {
            html += '<div style="background:rgba(0,0,0,0.3);padding:3px 8px;border-radius:4px;display:flex;align-items:center;gap:4px;font-size:10px;">';
            html += '<span>' + Utils.escHtml(state) + '</span>';
            html += '<button class="btn-sm-remove" style="padding:1px 4px;font-size:8px;" onclick="CharacterEditor.removeState(' + si + ')">✕</button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:4px;">';
        html += '<input id="ceNewState" placeholder="New state..." style="flex:1;">';
        html += '<button class="btn-sm-add" onclick="CharacterEditor.addState()">+ Add</button>';
        html += '</div>';

        html += '<label style="margin-top:6px;">Default State</label>';
        html += '<select id="ceDefaultState">';
        (char.states || ['Normal']).forEach(function(s) {
            html += '<option value="' + s + '"' + (char.defaultState === s ? ' selected' : '') + '>' + s + '</option>';
        });
        html += '</select>';

        // ---- Body Parts (FULLY CUSTOMIZABLE) ----
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🫦 Body Parts</h4>';
        html += '<div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Define which body parts this character has for sex act tracking. Each part becomes a counter field in choices.</div>';

        html += '<div id="ceBodyPartsList">';
        // ---- Toggle Body Parts ----
        if (Object.keys(bodyParts).length > 0) {
            html += '<h4 style="color:var(--accent);margin:12px 0 4px;">✅ Enable/Disable Body Parts</h4>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
            Object.keys(bodyParts).forEach(function(key) {
                html += '<label style="font-size:10px;display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.2);padding:3px 8px;border-radius:4px;">';
                html += '<input type="checkbox" ' + (bodyParts[key].enabled ? 'checked' : '') + ' onchange="CharacterEditor.toggleBodyPart(\'' + key + '\',this.checked)">';
                html += (bodyParts[key].icon || '●') + ' ' + Utils.escHtml(bodyParts[key].label || key);
                html += '</label>';
            });
            html += '</div>';
        }
        var bpKeys = Object.keys(bodyParts);
        if (bpKeys.length === 0) {
            html += '<div style="color:var(--dim);font-size:10px;font-style:italic;">No body parts defined yet. Add some below.</div>';
        }
        bpKeys.forEach(function(key) {
            html += '<div style="display:flex;gap:4px;align-items:center;margin:3px 0;background:rgba(0,0,0,0.2);padding:4px 6px;border-radius:4px;">';
            html += '<span style="flex:1;font-size:10px;">' + Utils.escHtml(key) + '</span>';
            html += '<label style="margin:0;font-size:9px;">Label:</label>';
            html += '<input value="' + Utils.escHtml(bodyParts[key].label || key) + '" onchange="CharacterEditor.updateBodyPartLabel(\'' + key + '\',this.value)" style="width:80px;font-size:10px;">';
            html += '<label style="margin:0;font-size:9px;">Icon:</label>';
            html += '<input value="' + Utils.escHtml(bodyParts[key].icon || '🫦') + '" id="bpIcon_' + key + '" onchange="CharacterEditor.updateBodyPartIcon(\'' + key + '\',this.value)" style="width:40px;font-size:10px;cursor:pointer;" class="emoji-trigger" onclick="EmojiPicker.open(\'bpIcon_' + key + '\',event)">';
            html += '<button class="btn-sm-remove" onclick="CharacterEditor.removeBodyPart(\'' + key + '\')">✕</button>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div style="display:flex;gap:4px;margin-top:4px;">';
        html += '<input id="ceNewBodyPartKey" placeholder="Key (e.g. hand, mouth)" style="flex:1;">';
        html += '<input id="ceNewBodyPartLabel" placeholder="Label (e.g. Handjob)" style="flex:1;">';
        html += '<input id="ceNewBodyPartIcon" value="🫦" style="width:45px;" class="emoji-trigger" onclick="EmojiPicker.open(\'ceNewBodyPartIcon\',event)">';
        html += '<button class="btn-sm-add" onclick="CharacterEditor.addBodyPart()">+</button>';
        html += '</div>';

        // ---- Quick Preset Body Parts ----
        html += '<div style="margin-top:6px;font-size:9px;color:var(--dim);">Quick add:</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px;">';
        [
            { key: 'oral', label: 'Oral', icon: '👄' },
            { key: 'vaginal', label: 'Vaginal', icon: '🌮' },
            { key: 'anal', label: 'Anal', icon: '🍑' },
            { key: 'hand', label: 'Handjob', icon: '✋' },
            { key: 'foot', label: 'Footjob', icon: '🦶' },
            { key: 'dick', label: 'Dick', icon: '🍆' },
            { key: 'breasts', label: 'Breasts', icon: '🍒' },
            { key: 'mouth', label: 'Mouth', icon: '👅' }
        ].forEach(function(quick) {
            html += '<button style="background:rgba(0,0,0,0.3);border:1px solid var(--border);color:var(--text);padding:2px 6px;border-radius:3px;font-size:9px;cursor:pointer;" onclick="CharacterEditor.quickAddBodyPart(\'' + quick.key + '\',\'' + quick.label + '\',\'' + quick.icon + '\')">' + quick.icon + ' ' + quick.label + '</button>';
        });
        html += '</div>';

        html += '</div>'; // end scrollable

        // ---- Buttons ----
        html += '<div style="margin-top:12px;display:flex;gap:6px;">';
        html += '<button style="background:var(--danger);" onclick="CharacterEditor.deleteCharacter()">🗑️ Delete Character</button>';
        html += '<div style="flex:1;"></div>';
        html += '<button style="background:var(--border);" onclick="UI.closeModal()">Cancel</button>';
        html += '<button style="background:var(--green);" onclick="CharacterEditor.save()">💾 Save</button>';
        html += '</div>';

        modalContent.innerHTML = html;
        overlay.classList.add('show');
    },

    // ---- Class Change ----
    onClassChange: function() {
        // Just updates UI hints — actual apply is on button click
    },

    applyClassPreset: function() {
        var classKey = document.getElementById('ceClass').value;
        if (classKey === 'custom') {
            alert('Select a preset to apply, or choose Custom to edit manually.');
            return;
        }
        if (!confirm('Apply preset "' + classKey + '"? This will overwrite clothing, states, and body parts.')) return;
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        CharacterClasses.applyPreset(p.config.characters[this.currentCharIndex], classKey);
        this.open(this.currentCharIndex);
        LeftPanel.render();
    },

    // ---- Clothing ----
    addClothing: function() {
        var input = document.getElementById('ceNewClothing');
        var val = input.value.trim();
        if (!val) return;
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].clothing) p.config.characters[this.currentCharIndex].clothing = [];
        p.config.characters[this.currentCharIndex].clothing.push(val);
        input.value = '';
        this.open(this.currentCharIndex);
    },

    removeClothing: function(index) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        p.config.characters[this.currentCharIndex].clothing.splice(index, 1);
        this.open(this.currentCharIndex);
    },

    // ---- States ----
    addState: function() {
        var input = document.getElementById('ceNewState');
        var val = input.value.trim();
        if (!val) return;
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].states) p.config.characters[this.currentCharIndex].states = [];
        p.config.characters[this.currentCharIndex].states.push(val);
        input.value = '';
        this.open(this.currentCharIndex);
    },

    removeState: function(index) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        p.config.characters[this.currentCharIndex].states.splice(index, 1);
        this.open(this.currentCharIndex);
    },

    // ---- Body Parts ----
    addBodyPart: function() {
        var keyInput = document.getElementById('ceNewBodyPartKey');
        var labelInput = document.getElementById('ceNewBodyPartLabel');
        var iconInput = document.getElementById('ceNewBodyPartIcon');
        var key = keyInput.value.trim().toLowerCase();
        var label = labelInput.value.trim();
        var icon = iconInput.value.trim() || '🫦';
        if (!key) { alert('Enter a body part key.'); return; }
        if (!label) { alert('Enter a label.'); return; }
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) p.config.characters[this.currentCharIndex].bodyParts = {};
        p.config.characters[this.currentCharIndex].bodyParts[key] = { label: label, icon: icon };
        keyInput.value = '';
        labelInput.value = '';
        iconInput.value = '🫦';
        this.open(this.currentCharIndex);
    },
    toggleBodyPart: function(key, enabled) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) return;
        if (p.config.characters[this.currentCharIndex].bodyParts[key]) {
            p.config.characters[this.currentCharIndex].bodyParts[key].enabled = enabled;
        }
    },

    quickAddBodyPart: function(key, label, icon) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) p.config.characters[this.currentCharIndex].bodyParts = {};
        p.config.characters[this.currentCharIndex].bodyParts[key] = { label: label, icon: icon };
        this.open(this.currentCharIndex);
    },

    removeBodyPart: function(key) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) return;
        delete p.config.characters[this.currentCharIndex].bodyParts[key];
        this.open(this.currentCharIndex);
    },

    updateBodyPartLabel: function(key, value) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) return;
        if (p.config.characters[this.currentCharIndex].bodyParts[key]) {
            p.config.characters[this.currentCharIndex].bodyParts[key].label = value;
        }
    },

    updateBodyPartIcon: function(key, value) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) return;
        if (p.config.characters[this.currentCharIndex].bodyParts[key]) {
            p.config.characters[this.currentCharIndex].bodyParts[key].icon = value;
        }
    },

    // ---- Save ----
    save: function() {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        char.name = document.getElementById('ceName').value.trim() || 'Character';
        char.role = document.getElementById('ceRole').value;
        char.defaultState = document.getElementById('ceDefaultState').value;
        UI.closeModal();
        LeftPanel.render();
        if (typeof Sidebar !== 'undefined') Sidebar.render();
    },

    // ---- Delete ----
    deleteCharacter: function() {
        if (!confirm('Delete this character permanently?')) return;
        var p = ProjectManager.getActive();
        if (!p) return;
        p.config.characters.splice(this.currentCharIndex, 1);
        UI.closeModal();
        LeftPanel.render();
    },
};