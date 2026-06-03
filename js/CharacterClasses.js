var CharacterClasses = {
    presets: {
        standardGirl: {
            name: 'Standard Girl',
            icon: '👩',
            clothing: ['top', 'bra', 'skirt', 'underwear'],
            states: ['Normal', 'Stripped', 'Exposed', 'Enslaved'],
            defaultState: 'Normal',
            bodyParts: {
                oral: { icon: '👄', label: 'Oral', enabled: true },
                vaginal: { icon: '🫦', label: 'Vaginal', enabled: true },
                anal: { icon: '🍑', label: 'Anal', enabled: true }
            }
        },
        standardBoy: {
            name: 'Standard Boy',
            icon: '🧑',
            clothing: ['top', 'pants', 'underwear'],
            states: ['Normal', 'Stripped', 'Enslaved'],
            defaultState: 'Normal',
            bodyParts: {
                oral: { icon: '👄', label: 'Oral', enabled: true },
                vaginal: { icon: '🫦', label: 'Vaginal', enabled: false },
                anal: { icon: '🍑', label: 'Anal', enabled: true }
            }
        }
    },

    getPreset: function(key) {
        return this.presets[key] || null;
    },

    getPresetKeys: function() {
        return Object.keys(this.presets);
    },

    clonePreset: function(key) {
        var preset = this.getPreset(key);
        if (!preset) return null;
        return JSON.parse(JSON.stringify(preset));
    },

    applyPreset: function(character, presetKey) {
        var preset = this.clonePreset(presetKey);
        if (!preset) return character;
        character.classPreset = presetKey;
        character.icon = preset.icon;
        character.clothing = preset.clothing.slice();
        character.states = preset.states.slice();
        character.defaultState = preset.defaultState;
        character.bodyParts = JSON.parse(JSON.stringify(preset.bodyParts));
        return character;
    },

    savePreset: function(key, data) {
        this.presets[key] = {
            name: data.name || key,
            icon: data.icon || '🧑',
            clothing: data.clothing || ['top', 'bottom'],
            states: data.states || ['Normal'],
            defaultState: data.defaultState || 'Normal',
            bodyParts: data.bodyParts || { oral: { icon: '👄', label: 'Oral', enabled: true } }
        };
        this.saveToStorage();
    },

    deletePreset: function(key) {
        if (key === 'standardGirl' || key === 'standardBoy') {
            alert('Cannot delete built-in presets.');
            return false;
        }
        delete this.presets[key];
        this.saveToStorage();
        return true;
    },

    isCustom: function(character) {
        return !character.classPreset || !this.presets[character.classPreset];
    },

    getDisplayName: function(character) {
        if (this.isCustom(character)) return 'Custom';
        var preset = this.getPreset(character.classPreset);
        return preset ? preset.name : 'Unknown';
    },

    getEnabledBodyParts: function(character) {
        var parts = [];
        if (character.bodyParts) {
            Object.keys(character.bodyParts).forEach(function(key) {
                if (character.bodyParts[key].enabled) {
                    parts.push({
                        key: key,
                        icon: character.bodyParts[key].icon || '●',
                        label: character.bodyParts[key].label || key
                    });
                }
            });
        }
        return parts;
    },

    // Create default body part
    createBodyPart: function(key, icon, label, enabled) {
        return {
            icon: icon || '●',
            label: label || key || 'Part',
            enabled: enabled !== undefined ? enabled : true
        };
    },

    saveToStorage: function() {
        var userPresets = {};
        var self = this;
        Object.keys(this.presets).forEach(function(key) {
            if (key !== 'standardGirl' && key !== 'standardBoy') {
                userPresets[key] = self.presets[key];
            }
        });
        try {
            localStorage.setItem('savida_class_presets', JSON.stringify(userPresets));
        } catch(e) {
            console.warn('Could not save class presets.');
        }
    },

    loadFromStorage: function() {
        try {
            var data = localStorage.getItem('savida_class_presets');
            if (data) {
                var userPresets = JSON.parse(data);
                var self = this;
                Object.keys(userPresets).forEach(function(key) {
                    self.presets[key] = userPresets[key];
                });
            }
        } catch(e) { /* use defaults */ }
    }
};

CharacterClasses.loadFromStorage();