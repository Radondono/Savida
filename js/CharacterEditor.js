var CharacterEditor = {
    currentCharIndex: -1,
    currentPoseKey: 'default',

    open: function(charIndex) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[charIndex]) return;
        this.currentCharIndex = charIndex;
        var char = p.config.characters[charIndex];
        this.currentPoseKey = char.currentPose || 'default';

        // Ensure all poses exist in ImageManager
        (char.poses || ['default']).forEach(function(pk) {
            ImageManager.addPose(char.id, pk, pk);
        });
        // Initialize expressions for current pose from character's global list
        (char.expressions || ['neutral']).forEach(function(ek) {
            ImageManager.addExpression(char.id, this.currentPoseKey, ek);
        }, this);

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
        var poses = char.poses || ['default'];
        var poseKey = this.currentPoseKey;
        var poseData = ImageManager.getPoseData(char.id, poseKey) || { base: null, clothing: {}, expressions: {} };
        var expressions = char.expressions || ['neutral'];

        var html = '<div style="display:flex;gap:16px;max-height:75vh;">';
        
        // ---- LEFT COLUMN ----
        html += '<div style="flex:1;overflow-y:auto;padding-right:6px;">';

        // Basic Info
        html += '<h4 style="color:var(--accent);margin:0 0 4px;">📋 Basic Info</h4>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<div style="flex:1;"><label>Name</label><input id="ceName" value="' + Utils.escHtml(char.name) + '"></div>';
        html += '<div style="flex:1;"><label>Role</label><select id="ceRole">';
        ['protagonist', 'companion', 'antagonist', 'neutral'].forEach(function(r) {
            html += '<option value="' + r + '"' + (char.role === r ? ' selected' : '') + '>' + r.charAt(0).toUpperCase() + r.slice(1) + '</option>';
        });
        html += '</select></div></div>';

        // Icon
        html += '<label>Icon <button class="btn-sm-edit emoji-trigger" onclick="EmojiPicker.open(\'ceIcon\',event)">Pick</button></label>';
        html += '<input id="ceIcon" value="' + (char.icon || '🧑') + '">';

        // Class
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🏗️ Class Preset</h4>';
        html += '<div style="display:flex;gap:6px;align-items:center;">';
        html += '<select id="ceClass" style="flex:1;">';
        CharacterClasses.getPresetKeys().forEach(function(key) {
            var pr = CharacterClasses.getPreset(key);
            html += '<option value="' + key + '"' + (char.classPreset === key ? ' selected' : '') + '>' + (pr ? pr.icon + ' ' + pr.name : key) + '</option>';
        });
        html += '<option value="custom"' + (isCustom ? ' selected' : '') + '>🧑 Custom</option>';
        html += '</select>';
        html += '<button class="btn-sm-edit" onclick="CharacterEditor.applyClassPreset()">Apply</button>';
        html += '</div>';

        if (!isCustom && preset) {
            html += '<div style="font-size:9px;color:var(--dim);margin-top:4px;">Preset: <strong>' + Utils.escHtml(preset.name) + '</strong></div>';
        }

        // ---- POSE SELECTOR ----
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🎭 Poses <button class="btn-sm-add" onclick="CharacterEditor.addPose()">+</button></h4>';
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">';
        poses.forEach(function(pk) {
            var pd = ImageManager.getPoseData(char.id, pk) || {};
            var isActive = pk === poseKey;
            html += '<div onclick="CharacterEditor.switchPose(\'' + pk + '\')" style="cursor:pointer;padding:6px 12px;border-radius:5px;font-size:11px;border:1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)') + ';background:' + (isActive ? 'rgba(224,64,128,0.2)' : 'rgba(0,0,0,0.3)') + ';font-weight:' + (isActive ? '700' : '400') + ';">';
            html += (pd.label || pk);
            if (pk !== 'default') html += ' <span onclick="event.stopPropagation();CharacterEditor.removePose(\'' + pk + '\')" style="color:var(--danger);margin-left:4px;">✕</span>';
            html += '</div>';
        });
        html += '</div>';

        // ---- POSE IMAGES ----
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🖼️ Pose: ' + (poseData.label || poseKey) + '</h4>';
        html += '<div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:6px;">';

        // Base image
        html += '<label>Base Image</label>';
        html += '<div style="display:flex;gap:8px;align-items:start;margin-bottom:4px;">';
        if (poseData.base) {
            html += '<img src="' + poseData.base + '" style="max-width:120px;max-height:160px;border-radius:4px;border:1px solid var(--border);">';
            html += '<button class="btn-sm-remove" onclick="ImageManager.setPoseBase(\'' + char.id + '\',\'' + poseKey + '\',null);CharacterEditor.open(' + this.currentCharIndex + ')">Remove</button>';
        } else {
            html += '<div style="color:var(--dim);font-size:10px;">No base image set.</div>';
        }
        html += '</div>';
        html += '<input type="file" id="ceBaseUpload" accept="image/png,image/webp,image/jpeg" style="font-size:10px;">';

        // Clothing for this pose
        html += '<label style="margin-top:10px;">Clothing Images</label>';
        (char.clothing || []).forEach(function(clothName, ci) {
            var clothImg = ImageManager.getPoseClothing(char.id, poseKey, clothName);
            html += '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;padding:4px;background:rgba(0,0,0,0.15);border-radius:4px;">';
            html += '<span style="font-size:10px;min-width:60px;">' + (ci+1) + '. ' + Utils.escHtml(clothName) + '</span>';
            if (clothImg) {
                html += '<img src="' + clothImg + '" style="max-width:45px;max-height:45px;border-radius:3px;">';
                html += '<button class="btn-sm-remove" onclick="ImageManager.removePoseClothing(\'' + char.id + '\',\'' + poseKey + '\',\'' + clothName + '\');CharacterEditor.open(' + this.currentCharIndex + ')">✕</button>';
            } else {
                html += '<span style="color:var(--dim);font-size:9px;">No img</span>';
            }
            html += '<input type="file" id="ceClothUpload_' + ci + '" accept="image/png,image/webp,image/jpeg" style="font-size:9px;width:110px;">';
            html += '</div>';
        });

        // Expressions for this pose
        html += '<label style="margin-top:10px;">😊 Expressions <button class="btn-sm-add" onclick="CharacterEditor.addExpression(\'' + poseKey + '\')">+</button></label>';
        expressions.forEach(function(exprKey) {
            var exprData = (poseData.expressions && poseData.expressions[exprKey]) ? poseData.expressions[exprKey] : { eyes: null, mouth: null };
            var isNeutral = exprKey === 'neutral';
            html += '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;padding:5px 8px;background:rgba(0,0,0,0.2);border-radius:4px;">';
            html += '<span style="font-size:10px;min-width:55px;font-weight:' + (isNeutral ? '700' : '400') + ';">' + Utils.escHtml(exprKey) + '</span>';
            
            html += '<span style="font-size:8px;">Eyes:</span>';
            if (exprData.eyes) {
                html += '<img src="' + exprData.eyes + '" style="max-width:40px;max-height:24px;border-radius:2px;">';
            } else {
                html += '<span style="color:var(--dim);font-size:8px;">-</span>';
            }
            html += '<input type="file" id="ceExprEyes_' + exprKey + '" accept="image/png,image/webp,image/jpeg" style="font-size:8px;width:75px;">';
            
            html += '<span style="font-size:8px;">Mouth:</span>';
            if (exprData.mouth) {
                html += '<img src="' + exprData.mouth + '" style="max-width:40px;max-height:24px;border-radius:2px;">';
            } else {
                html += '<span style="color:var(--dim);font-size:8px;">-</span>';
            }
            html += '<input type="file" id="ceExprMouth_' + exprKey + '" accept="image/png,image/webp,image/jpeg" style="font-size:8px;width:75px;">';
            
            if (!isNeutral) {
                html += '<button class="btn-sm-remove" onclick="CharacterEditor.removeExpressionAndRefresh(\'' + char.id + '\',\'' + poseKey + '\',\'' + exprKey + '\')">✕</button>';
            }
            html += '</div>';
        });

        html += '</div>'; // close pose images

        // Clothing names
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">👔 Clothing Items</h4>';
        html += '<div style="font-size:9px;color:var(--dim);margin-bottom:4px;">Drag to reorder. First = innermost layer.</div>';
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
        html += '<label>Default State</label><select id="ceDefaultState">';
        (char.states || ['Normal']).forEach(function(s) {
            html += '<option value="' + s + '"' + (char.defaultState === s ? ' selected' : '') + '>' + s + '</option>';
        });
        html += '</select>';

        // Body Parts
        html += '<h4 style="color:var(--accent);margin:12px 0 4px;">🫦 Body Parts</h4>';
        if (Object.keys(bodyParts).length > 0) {
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px;">';
            Object.keys(bodyParts).forEach(function(key) {
                html += '<label style="font-size:10px;display:flex;align-items:center;gap:3px;background:rgba(0,0,0,0.2);padding:3px 8px;border-radius:4px;">';
                html += '<input type="checkbox" ' + (bodyParts[key].enabled ? 'checked' : '') + ' onchange="CharacterEditor.toggleBodyPart(\'' + key + '\',this.checked)">';
                html += (bodyParts[key].icon || '●') + ' ' + Utils.escHtml(bodyParts[key].label || key);
                html += '</label>';
            });
            html += '</div>';
        }
        html += '<div style="display:flex;gap:4px;margin-top:4px;">';
        html += '<input id="ceNewBodyPartKey" placeholder="Key" style="flex:1;">';
        html += '<input id="ceNewBodyPartLabel" placeholder="Label" style="flex:1;">';
        html += '<input id="ceNewBodyPartIcon" value="🫦" style="width:40px;" class="emoji-trigger" onclick="EmojiPicker.open(\'ceNewBodyPartIcon\',event)">';
        html += '<button class="btn-sm-add" onclick="CharacterEditor.addBodyPart()">+</button>';
        html += '</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">';
        [
            { key: 'oral', label: 'Oral', icon: '👄' }, { key: 'vaginal', label: 'Vaginal', icon: '🌮' },
            { key: 'anal', label: 'Anal', icon: '🍑' }, { key: 'hand', label: 'Handjob', icon: '✋' },
            { key: 'foot', label: 'Footjob', icon: '🦶' }, { key: 'dick', label: 'Dick', icon: '🍆' },
            { key: 'breasts', label: 'Breasts', icon: '🍒' }, { key: 'mouth', label: 'Mouth', icon: '👅' }
        ].forEach(function(quick) {
            html += '<button style="background:rgba(0,0,0,0.3);border:1px solid var(--border);color:var(--text);padding:2px 6px;border-radius:3px;font-size:9px;cursor:pointer;" onclick="CharacterEditor.quickAddBodyPart(\'' + quick.key + '\',\'' + quick.label + '\',\'' + quick.icon + '\')">' + quick.icon + ' ' + quick.label + '</button>';
        });
        html += '</div>';

        html += '</div>'; // end left column

        // ---- RIGHT COLUMN: Live Preview ----
        html += '<div style="width:260px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px;background:rgba(0,0,0,0.2);border-radius:10px;padding:12px;position:sticky;top:0;">';
        html += '<h4 style="color:var(--accent);margin:0;">🔍 Live Preview</h4>';
        html += '<div id="cePreviewContainer" style="position:relative;width:220px;height:320px;background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;border:1px solid var(--border);"></div>';
        html += '<div style="font-size:9px;color:var(--dim);">Pose: ' + (poseData.label || poseKey) + ' | Expr: neutral</div>';
        html += '</div>';

        html += '</div>'; // end flex row

        // Buttons
        html += '<div style="margin-top:14px;display:flex;gap:6px;">';
        html += '<button style="background:var(--danger);" onclick="CharacterEditor.deleteCharacter()">🗑️ Delete</button>';
        html += '<div style="flex:1;"></div>';
        html += '<button style="background:var(--border);" onclick="UI.closeModal()">Cancel</button>';
        html += '<button style="background:var(--green);" onclick="CharacterEditor.save()">💾 Save</button>';
        html += '</div>';

        modalContent.innerHTML = html;
        overlay.classList.add('show');
        
        var self = this;
        setTimeout(function() {
            self.initClothingDragDrop();
            self.renderPreview();
            self._bindImageUploads(char.id, poseKey, char.clothing || [], expressions);
        }, 200);
    },

    _bindImageUploads: function(charId, poseKey, clothing, expressions) {
        var self = this;
        
        var baseUpload = document.getElementById('ceBaseUpload');
        if (baseUpload) {
            baseUpload.addEventListener('change', function() {
                self.uploadPoseBase(charId, poseKey, this);
            });
        }
        
        clothing.forEach(function(clothName, ci) {
            var clothUpload = document.getElementById('ceClothUpload_' + ci);
            if (clothUpload) {
                clothUpload.addEventListener('change', function() {
                    self.uploadPoseClothing(charId, poseKey, clothName, this);
                });
            }
        });
        
        expressions.forEach(function(exprKey) {
            var eyesUpload = document.getElementById('ceExprEyes_' + exprKey);
            if (eyesUpload) {
                eyesUpload.addEventListener('change', function() {
                    self.uploadExpressionPart(charId, poseKey, exprKey, 'eyes', this);
                });
            }
            var mouthUpload = document.getElementById('ceExprMouth_' + exprKey);
            if (mouthUpload) {
                mouthUpload.addEventListener('change', function() {
                    self.uploadExpressionPart(charId, poseKey, exprKey, 'mouth', this);
                });
            }
        });
    },

    switchPose: function(poseKey) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        p.config.characters[this.currentCharIndex].currentPose = poseKey;
        this.currentPoseKey = poseKey;
        this.open(this.currentCharIndex);
    },

    refreshPose: function() {
        this.renderPreview();
    },

    addPose: function() {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        var key = prompt('Pose key (e.g. kneeling, sitting):');
        if (!key) return;
        key = key.toLowerCase().replace(/\s+/g, '_');
        var label = prompt('Display name:', key);
        if (!label) return;
        if (!char.poses) char.poses = ['default'];
        if (char.poses.indexOf(key) < 0) char.poses.push(key);
        ImageManager.addPose(char.id, key, label);
        (char.expressions || ['neutral']).forEach(function(ek) {
            ImageManager.addExpression(char.id, key, ek);
        });
        this.currentPoseKey = key;
        this.open(this.currentCharIndex);
    },

    removePose: function(poseKey) {
        if (poseKey === 'default') { alert('Cannot remove default pose.'); return; }
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        char.poses = char.poses.filter(function(pk) { return pk !== poseKey; });
        ImageManager.removePose(char.id, poseKey);
        this.currentPoseKey = 'default';
        this.open(this.currentCharIndex);
    },

    addExpression: function(poseKey) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        var key = prompt('Expression key (e.g. angry, happy):');
        if (!key) return;
        key = key.toLowerCase().replace(/\s+/g, '_');
        if (!char.expressions) char.expressions = ['neutral'];
        if (char.expressions.indexOf(key) < 0) char.expressions.push(key);
        (char.poses || ['default']).forEach(function(pk) {
            ImageManager.addExpression(char.id, pk, key);
        });
        this.open(this.currentCharIndex);
    },

    removeExpressionAndRefresh: function(charId, poseKey, exprKey) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        char.expressions = (char.expressions || ['neutral']).filter(function(e) { return e !== exprKey; });
        (char.poses || ['default']).forEach(function(pk) {
            ImageManager.removeExpression(charId, pk, exprKey);
        });
        this.open(this.currentCharIndex);
    },

    uploadPoseBase: function(charId, poseKey, input) {
        var file = input.files[0]; if (!file) return;
        var self = this;
        ImageManager.readFileAsDataURL(file).then(function(dataUrl) {
            return ImageManager.compressImage(dataUrl, 1000, 700, 1.0);
        }).then(function(compressed) {
            ImageManager.setPoseBase(charId, poseKey, compressed);
            self.renderPreview();
            input.value = '';
        }).catch(function(err) { console.error('Upload failed:', err); input.value = ''; });
    },

    uploadPoseClothing: function(charId, poseKey, clothName, input) {
        var file = input.files[0]; if (!file) return;
        var self = this;
        ImageManager.readFileAsDataURL(file).then(function(dataUrl) {
            return ImageManager.compressImage(dataUrl, 1000, 700, 1.0);
        }).then(function(compressed) {
            ImageManager.setPoseClothing(charId, poseKey, clothName, compressed);
            self.renderPreview();
            input.value = '';
        }).catch(function(err) { console.error('Upload failed:', err); input.value = ''; });
    },

    uploadExpressionPart: function(charId, poseKey, exprKey, part, input) {
        var file = input.files[0]; if (!file) return;
        var self = this;
        ImageManager.readFileAsDataURL(file).then(function(dataUrl) {
            return ImageManager.compressImage(dataUrl, 800, 400, 1.0);
        }).then(function(compressed) {
            ImageManager.setExpressionPart(charId, poseKey, exprKey, part, compressed);
            self.renderPreview();
            input.value = '';
        }).catch(function(err) { console.error('Upload failed:', err); input.value = ''; });
    },

    renderPreview: function() {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        var poseKey = this.currentPoseKey;
        var container = document.getElementById('cePreviewContainer');
        if (!container) return;

        var poseData = ImageManager.getPoseData(char.id, poseKey) || { base: null, clothing: {}, expressions: {} };
        container.innerHTML = '';
        var hasAny = false;

        if (poseData.base) {
            var img = document.createElement('img');
            img.src = poseData.base;
            img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:1;';
            container.appendChild(img);
            hasAny = true;
        }

        (char.clothing || []).forEach(function(clothName, ci) {
            if (poseData.clothing && poseData.clothing[clothName]) {
                var cimg = document.createElement('img');
                cimg.src = poseData.clothing[clothName];
                cimg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:' + (2 + ci) + ';';
                container.appendChild(cimg);
                hasAny = true;
            }
        });

        var neutralExpr = (poseData.expressions && poseData.expressions['neutral']) ? poseData.expressions['neutral'] : { eyes: null, mouth: null };
        if (neutralExpr.eyes) {
            var eimg = document.createElement('img');
            eimg.src = neutralExpr.eyes;
            eimg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:99;pointer-events:none;';
            container.appendChild(eimg);
        }
        if (neutralExpr.mouth) {
            var mimg = document.createElement('img');
            mimg.src = neutralExpr.mouth;
            mimg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;z-index:100;pointer-events:none;';
            container.appendChild(mimg);
        }

        if (!hasAny && !neutralExpr.eyes && !neutralExpr.mouth) {
            var fallback = document.createElement('div');
            fallback.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:var(--dim);font-size:3em;';
            fallback.textContent = char.icon || '🧑';
            container.appendChild(fallback);
        }
    },

    updatePreview: function() { this.renderPreview(); },

    applyClassPreset: function() {
        var classKey = document.getElementById('ceClass').value;
        if (classKey === 'custom') { alert('Select a preset to apply.'); return; }
        if (!confirm('Apply preset "' + classKey + '"? This overwrites clothing, states, and body parts.')) return;
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        CharacterClasses.applyPreset(p.config.characters[this.currentCharIndex], classKey);
        this.open(this.currentCharIndex);
        LeftPanel.render();
    },

    addClothing: function() {
        var input = document.getElementById('ceNewClothing'); var val = input.value.trim(); if (!val) return;
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].clothing) p.config.characters[this.currentCharIndex].clothing = [];
        p.config.characters[this.currentCharIndex].clothing.push(val);
        input.value = ''; this.open(this.currentCharIndex);
    },
    removeClothing: function(index) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        p.config.characters[this.currentCharIndex].clothing.splice(index, 1);
        this.open(this.currentCharIndex);
    },

    initClothingDragDrop: function() {
        var list = document.getElementById('ceClothingList'); if (!list) return;
        var items = list.querySelectorAll('.cloth-drag-item');
        var self = this; var draggedIndex = -1;
        items.forEach(function(item) {
            item.addEventListener('dragstart', function(e) { draggedIndex = parseInt(this.dataset.clothIndex); this.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
            item.addEventListener('dragend', function() { this.style.opacity = '1'; });
            item.addEventListener('dragover', function(e) { e.preventDefault(); });
            item.addEventListener('drop', function(e) {
                e.preventDefault();
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

    addState: function() {
        var input = document.getElementById('ceNewState'); var val = input.value.trim(); if (!val) return;
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].states) p.config.characters[this.currentCharIndex].states = [];
        p.config.characters[this.currentCharIndex].states.push(val);
        input.value = ''; this.open(this.currentCharIndex);
    },
    removeState: function(index) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        p.config.characters[this.currentCharIndex].states.splice(index, 1);
        this.open(this.currentCharIndex);
    },

    addBodyPart: function() {
        var k = document.getElementById('ceNewBodyPartKey'), l = document.getElementById('ceNewBodyPartLabel'), i = document.getElementById('ceNewBodyPartIcon');
        var key = k.value.trim().toLowerCase(), label = l.value.trim(), icon = i.value.trim() || '🫦';
        if (!key || !label) { alert('Key and label required.'); return; }
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) p.config.characters[this.currentCharIndex].bodyParts = {};
        p.config.characters[this.currentCharIndex].bodyParts[key] = { label: label, icon: icon, enabled: true };
        this.open(this.currentCharIndex);
    },
    quickAddBodyPart: function(key, label, icon) {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        if (!p.config.characters[this.currentCharIndex].bodyParts) p.config.characters[this.currentCharIndex].bodyParts = {};
        if (!p.config.characters[this.currentCharIndex].bodyParts[key]) {
            p.config.characters[this.currentCharIndex].bodyParts[key] = { label: label, icon: icon, enabled: true };
        } else { p.config.characters[this.currentCharIndex].bodyParts[key].enabled = true; }
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
        if (p.config.characters[this.currentCharIndex].bodyParts[key]) p.config.characters[this.currentCharIndex].bodyParts[key].enabled = enabled;
    },

    save: function() {
        var p = ProjectManager.getActive();
        if (!p || !p.config.characters[this.currentCharIndex]) return;
        var char = p.config.characters[this.currentCharIndex];
        var nameEl = document.getElementById('ceName'), roleEl = document.getElementById('ceRole');
        var iconEl = document.getElementById('ceIcon'), stateEl = document.getElementById('ceDefaultState');
        if (nameEl) char.name = nameEl.value.trim() || 'Character';
        if (roleEl) char.role = roleEl.value;
        if (iconEl) char.icon = iconEl.value || '🧑';
        if (stateEl) char.defaultState = stateEl.value;
        char.currentPose = this.currentPoseKey;
        UI.closeModal();
        LeftPanel.render();
        if (typeof Sidebar !== 'undefined') Sidebar.render();
    },

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