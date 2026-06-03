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

        var html = '<div style="display:flex;gap:12px;max-height:65vh;">';
        
        // ---- LEFT COLUMN: Editor Fields ----
        html += '<div style="flex:1;overflow-y:auto;padding-right:4px;">';

        // Basic Info
        html += '<h4 style="color:var(--accent);margin:0 0 4px;">📋 Basic Info</h4>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<div style="flex:1;"><label>Name</label><input id="ceName" value="' + Utils.escHtml(char.name) + '" onchange="CharacterEditor.updatePreview()"></div>';
        html += '<div style="flex:1;"><label>Role</label><select id="ceRole" onchange="CharacterEditor.updatePreview()">';
        ['protagonist', 'companion', 'antagonist', 'neutral'].forEach(function(r) {
            html += '<option value="' + r + '"' + (char.role === r ? ' selected' : '') + '>' +
                    r.charAt(0).toUpperCase() + r.slice(1) + '</option>';
        });
        html += '</select></div></div>';

        // Icon
        html += '<label>Icon <button class="btn-sm-edit emoji-trigger" onclick="EmojiPicker.open(\'ceIcon\',event)">Pick</button></label>';
        html += '<input id="ceIcon" value="' + (char.icon || '🧑') + '" onchange="CharacterEditor.updatePreview()">';

        // Class
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🏗️ Class Preset</h4>';
        html += '<div style="display:flex;gap:6px;align-items:center;">';
        html += '<select id="ceClass" style="flex:1;">';
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
            html += 'Preset: <strong>' + Utils.escHtml(preset.name) + '</strong> — ';
            html += preset.clothing.join(', ') + ' | ' + preset.states.join(', ');
            html += '</div>';
        }

        // Clothing
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">👔 Clothing Items</h4>';
        html += '<div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Drag to reorder. First = innermost layer. Check which items to strip per choice in the sidebar.</div>';
        html += '<div id="ceClothingList" style="display:flex;flex-direction:column;gap:3px;margin-bottom:4px;">';
        (char.clothing || []).forEach(function(item, ci) {
            html += '<div class="cloth-drag-item" draggable="true" data-cloth-index="' + ci + '" style="display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.3);padding:5px 8px;border-radius:4px;cursor:grab;font-size:10px;border:1px solid transparent;">';
            html += '<span style="cursor:grab;color:var(--dim);">⠿</span>';
            html += '<span style="font-size:9px;color:var(--dim);min-width:18px;">' + (ci + 1) + '.</span>';
            html += '<span style="flex:1;">' + Utils.escHtml(item) + '</span>';
            html += '<button class="btn-sm-remove" style="padding:1px 5px;font-size:8px;" onclick="event.stopPropagation();CharacterEditor.removeClothing(' + ci + ')">✕</button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:4px;">';
        html += '<input id="ceNewClothing" placeholder="New clothing item..." style="flex:1;">';
        html += '<button class="btn-sm-add" onclick="CharacterEditor.addClothing()">+ Add</button>';
        html += '</div>';

        // States
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
        html += '<label>Default State</label><select id="ceDefaultState" onchange="CharacterEditor.updatePreview()">';
        (char.states || ['Normal']).forEach(function(s) {
            html += '<option value="' + s + '"' + (char.defaultState === s ? ' selected' : '') + '>' + s + '</option>';
        });
        html += '</select>';

        // Body Parts
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🫦 Body Parts</h4>';
        html += '<div id="ceBodyPartsList">';
        if (Object.keys(bodyParts).length > 0) {
            html += '<div style="margin-bottom:6px;"><strong style="font-size:10px;">✅ Enable/Disable:</strong></div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">';
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
            html += '<div style="color:var(--dim);font-size:10px;font-style:italic;">No body parts defined.</div>';
        }
        bpKeys.forEach(function(key) {
            html += '<div style="display:flex;gap:4px;align-items:center;margin:3px 0;background:rgba(0,0,0,0.2);padding:4px 6px;border-radius:4px;">';
            html += '<span style="flex:1;font-size:10px;">' + Utils.escHtml(key) + '</span>';
            html += '<input value="' + Utils.escHtml(bodyParts[key].label || key) + '" onchange="CharacterEditor.updateBodyPartLabel(\'' + key + '\',this.value)" style="width:70px;font-size:10px;" placeholder="Label">';
            html += '<input value="' + Utils.escHtml(bodyParts[key].icon || '🫦') + '" id="bpIcon_' + key + '" onchange="CharacterEditor.updateBodyPartIcon(\'' + key + '\',this.value)" style="width:35px;font-size:10px;cursor:pointer;" class="emoji-trigger" onclick="EmojiPicker.open(\'bpIcon_' + key + '\',event)">';
            html += '<button class="btn-sm-remove" onclick="CharacterEditor.removeBodyPart(\'' + key + '\')">✕</button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div style="display:flex;gap:4px;margin-top:4px;">';
        html += '<input id="ceNewBodyPartKey" placeholder="Key" style="flex:1;">';
        html += '<input id="ceNewBodyPartLabel" placeholder="Label" style="flex:1;">';
        html += '<input id="ceNewBodyPartIcon" value="🫦" style="width:40px;" class="emoji-trigger" onclick="EmojiPicker.open(\'ceNewBodyPartIcon\',event)">';
        html += '<button class="btn-sm-add" onclick="CharacterEditor.addBodyPart()">+</button>';
        html += '</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">';
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

        html += '</div>'; // end left column

        // ---- RIGHT COLUMN: Live Preview ----
        html += '<div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:8px;background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;position:sticky;top:0;">';
        html += '<h4 style="color:var(--accent);margin:0;">🔍 Live Preview</h4>';
        
        // Character preview image
        html += '<div id="cePreviewContainer" style="position:relative;width:180px;height:260px;background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;border:1px solid var(--border);">';
        html += '<div id="cePreviewNoImage" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--dim);font-size:3em;">' + (char.icon || '🧑') + '</div>';
        html += '</div>';

        // Clothing layers display
        html += '<div id="cePreviewClothing" style="width:100%;font-size:9px;">';
        html += '<div style="color:var(--dim);text-align:center;margin-bottom:4px;">Clothing Layers:</div>';
        (char.clothing || []).forEach(function(item, ci) {
            html += '<div class="cloth-preview-item" data-cloth-index="' + ci + '" style="display:flex;align-items:center;gap:4px;padding:3px 6px;margin:2px 0;background:rgba(0,0,0,0.25);border-radius:3px;cursor:pointer;font-size:9px;">';
            html += '<span style="color:var(--dim);">' + (ci + 1) + '.</span>';
            html += '<span style="flex:1;">' + Utils.escHtml(item) + '</span>';
            html += '<span class="cloth-preview-dot" style="width:6px;height:6px;border-radius:50%;background:var(--green);" title="Visible"></span>';
            html += '</div>';
        });
        html += '</div>';

        // Stats summary
        html += '<div style="width:100%;font-size:9px;color:var(--dim);text-align:center;">';
        html += (char.clothing || []).length + ' clothing · ' + (char.states || []).length + ' states · ' + Object.keys(bodyParts).length + ' body parts';
        html += '</div>';

        html += '</div>'; // end right column

        html += '</div>'; // end flex row

        // Buttons
        html += '<div style="margin-top:12px;display:flex;gap:6px;">';
        html += '<button style="background:var(--danger);" onclick="CharacterEditor.deleteCharacter()">🗑️ Delete</button>';
        html += '<div style="flex:1;"></div>';
        html += '<button style="background:var(--border);" onclick="UI.closeModal()">Cancel</button>';
        html += '<button style="background:var(--green);" onclick="CharacterEditor.save()">💾 Save</button>';
        html += '</div>';

        modalContent.innerHTML = html;
        overlay.classList.add('show');
        
        // Initialize drag-drop and preview
        var self = this;
        setTimeout(function() {
            self.initClothingDragDrop();
            self.renderPreview();
        }, 150);
    },

    // ---- LIVE PREVIEW ----
    renderPreview: function() {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        
        var container = document.getElementById('cePreviewContainer');
        var noImg = document.getElementById('cePreviewNoImage');
        if (!container) return;

        // Get current base image
        var baseImg = ImageManager.getBaseImage(char.id);
        var clothingImgs = ImageManager.getClothingImages(char.id);
        
        // Clear container
        container.innerHTML = '';
        
        var hasAny = false;
        
        // Base image
        if (baseImg) {
            var img = document.createElement('img');
            img.src = baseImg;
            img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:1;';
            container.appendChild(img);
            hasAny = true;
        }
        
        // Clothing layers in order
        (char.clothing || []).forEach(function(clothName, ci) {
            if (clothingImgs[clothName]) {
                var cimg = document.createElement('img');
                cimg.src = clothingImgs[clothName];
                cimg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:' + (2 + ci) + ';';
                container.appendChild(cimg);
                hasAny = true;
            }
        });
        
        // No image fallback
        if (!hasAny) {
            var fallback = document.createElement('div');
            fallback.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--dim);font-size:3em;';
            fallback.textContent = char.icon || '🧑';
            container.appendChild(fallback);
        }
    },

    updatePreview: function() {
        // Update preview when name/icon changes (without full refresh)
        var nameEl = document.getElementById('ceName');
        var iconEl = document.getElementById('ceIcon');
        if (nameEl && iconEl) {
            var p = ProjectManager.getActive();
            if (p && p.config.characters[this.currentCharIndex]) {
                p.config.characters[this.currentCharIndex].name = nameEl.value.trim() || 'Character';
                p.config.characters[this.currentCharIndex].icon = iconEl.value || '🧑';
            }
        }
        this.renderPreview();
    },

    // ---- Image Uploads ----
    uploadBaseImage: async function(charId, input) {
        var file = input.files[0];
        if (!file) return;
        var dataUrl = await ImageManager.readFileAsDataURL(file);
        var compressed = await ImageManager.compressImage(dataUrl);
        ImageManager.setBaseImage(charId, compressed);
        this.renderPreview();
    },

    uploadClothingImage: async function(charId, clothName, input) {
        var file = input.files[0];
        if (!file) return;
        var dataUrl = await ImageManager.readFileAsDataURL(file);
        var compressed = await ImageManager.compressImage(dataUrl);
        ImageManager.setClothingImage(charId, clothName, compressed);
        this.renderPreview();
    },

    // ---- Class ----
    onClassChange: function() {},

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
        var char = p.config.characters[this.currentCharIndex];
        var removedName = char.clothing[index];
        char.clothing.splice(index, 1);
        if (removedName) ImageManager.removeClothingImage(char.id, removedName);
        this.open(this.currentCharIndex);
    },

    // ---- Clothing Reorder ----
    initClothingDragDrop: function() {
        var list = document.getElementById('ceClothingList');
        if (!list) return;
        
        var items = list.querySelectorAll('.cloth-drag-item');
        var self = this;
        var draggedIndex = -1;

        items.forEach(function(item) {
            item.addEventListener('dragstart', function(e) {
                draggedIndex = parseInt(this.dataset.clothIndex);
                this.style.opacity = '0.4';
                this.style.border = '1px dashed var(--accent)';
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', function(e) {
                this.style.opacity = '1';
                this.style.border = '1px solid transparent';
                document.querySelectorAll('.cloth-drag-item').forEach(function(el) {
                    el.style.borderTop = 'none';
                    el.style.borderBottom = 'none';
                });
            });

            item.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                var rect = this.getBoundingClientRect();
                var midY = rect.top + rect.height / 2;
                document.querySelectorAll('.cloth-drag-item').forEach(function(el) {
                    el.style.borderTop = 'none';
                    el.style.borderBottom = 'none';
                });
                if (e.clientY < midY) {
                    this.style.borderTop = '2px solid var(--accent)';
                } else {
                    this.style.borderBottom = '2px solid var(--accent)';
                }
            });

            item.addEventListener('dragleave', function(e) {
                this.style.borderTop = 'none';
                this.style.borderBottom = 'none';
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.borderTop = 'none';
                this.style.borderBottom = 'none';
                
                var targetIndex = parseInt(this.dataset.clothIndex);
                if (draggedIndex === targetIndex || draggedIndex < 0) return;
                
                var p = ProjectManager.getActive();
                if (!p || !p.config.characters[self.currentCharIndex]) return;
                var char = p.config.characters[self.currentCharIndex];
                
                var movedItem = char.clothing.splice(draggedIndex, 1)[0];
                char.clothing.splice(targetIndex, 0, movedItem);
                
                self.open(self.currentCharIndex);
            });
        });
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
        p.config.characters[this.currentCharIndex].bodyParts[key] = { label: label, icon: icon, enabled: true };
        keyInput.value = '';
        labelInput.value = '';
        iconInput.value = '🫦';
        this.open(this.currentCharIndex);
    },

    quickAddBodyPart: function(key, label, icon) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) p.config.characters[this.currentCharIndex].bodyParts = {};
        if (!p.config.characters[this.currentCharIndex].bodyParts[key]) {
            p.config.characters[this.currentCharIndex].bodyParts[key] = { label: label, icon: icon, enabled: true };
        } else {
            p.config.characters[this.currentCharIndex].bodyParts[key].enabled = true;
        }
        this.open(this.currentCharIndex);
    },

    removeBodyPart: function(key) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) return;
        delete p.config.characters[this.currentCharIndex].bodyParts[key];
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
        var nameEl = document.getElementById('ceName');
        var roleEl = document.getElementById('ceRole');
        var iconEl = document.getElementById('ceIcon');
        var stateEl = document.getElementById('ceDefaultState');
        if (nameEl) char.name = nameEl.value.trim() || 'Character';
        if (roleEl) char.role = roleEl.value;
        if (iconEl) char.icon = iconEl.value || '🧑';
        if (stateEl) char.defaultState = stateEl.value;
        UI.closeModal();
        LeftPanel.render();
        if (typeof Sidebar !== 'undefined') Sidebar.render();
    },

    // ---- Delete ----
    deleteCharacter: function() {
        if (!confirm('Delete this character permanently?')) return;
        var p = ProjectManager.getActive();
        if (!p) return;
        var char = p.config.characters[this.currentCharIndex];
        ImageManager.clearCharacter(char.id);
        p.config.characters.splice(this.currentCharIndex, 1);
        UI.closeModal();
        LeftPanel.render();
    }
};