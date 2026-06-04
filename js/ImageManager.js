var ImageManager = {
    _imageStore: {},

    init: function() {
        this._loadFromStorage();
    },

    _getCharStore: function(charId) {
        var p = ProjectManager.getActive();
        if (!p) return null;
        if (!this._imageStore[p.id]) this._imageStore[p.id] = {};
        if (!this._imageStore[p.id][charId]) this._imageStore[p.id][charId] = { poses: {} };
        return this._imageStore[p.id][charId];
    },

    // ---- POSE MANAGEMENT ----
    addPose: function(charId, poseKey, label) {
        var store = this._getCharStore(charId);
        if (!store) return;
        if (!store.poses) store.poses = {};
        if (!store.poses[poseKey]) {
            store.poses[poseKey] = {
                label: label || poseKey,
                base: null,
                clothing: {},
                expressions: { neutral: { eyes: null, mouth: null } }
            };
            this._saveToStorage();
        }
    },

    removePose: function(charId, poseKey) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return;
        if (poseKey === 'default') return;
        delete store.poses[poseKey];
        this._saveToStorage();
    },

    getPoses: function(charId) {
        var store = this._getCharStore(charId);
        return (store && store.poses) ? Object.keys(store.poses) : [];
    },

    getPoseData: function(charId, poseKey) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return null;
        return store.poses[poseKey];
    },

    // ---- POSE BASE ----
    setPoseBase: function(charId, poseKey, dataUrl) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return;
        store.poses[poseKey].base = dataUrl;
        this._saveToStorage();
    },

    getPoseBase: function(charId, poseKey) {
        var store = this._getCharStore(charId);
        return (store && store.poses && store.poses[poseKey]) ? store.poses[poseKey].base : null;
    },

    // ---- POSE CLOTHING ----
    setPoseClothing: function(charId, poseKey, clothName, dataUrl) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return;
        if (!store.poses[poseKey].clothing) store.poses[poseKey].clothing = {};
        store.poses[poseKey].clothing[clothName] = dataUrl;
        this._saveToStorage();
    },

    getPoseClothing: function(charId, poseKey, clothName) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return null;
        if (!store.poses[poseKey].clothing) return null;
        return store.poses[poseKey].clothing[clothName] || null;
    },

    getPoseClothingAll: function(charId, poseKey) {
        var store = this._getCharStore(charId);
        return (store && store.poses && store.poses[poseKey] && store.poses[poseKey].clothing)
            ? store.poses[poseKey].clothing : {};
    },

    removePoseClothing: function(charId, poseKey, clothName) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey] || !store.poses[poseKey].clothing) return;
        delete store.poses[poseKey].clothing[clothName];
        this._saveToStorage();
    },

    // ---- EXPRESSIONS ----
    addExpression: function(charId, poseKey, exprKey) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return;
        if (!store.poses[poseKey].expressions) store.poses[poseKey].expressions = {};
        if (!store.poses[poseKey].expressions[exprKey]) {
            store.poses[poseKey].expressions[exprKey] = { eyes: null, mouth: null };
            this._saveToStorage();
        }
    },

    removeExpression: function(charId, poseKey, exprKey) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey] || !store.poses[poseKey].expressions) return;
        if (exprKey === 'neutral') return;
        delete store.poses[poseKey].expressions[exprKey];
        this._saveToStorage();
    },

    getExpressions: function(charId, poseKey) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey] || !store.poses[poseKey].expressions) return [];
        return Object.keys(store.poses[poseKey].expressions);
    },

    setExpressionPart: function(charId, poseKey, exprKey, part, dataUrl) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return;
        if (!store.poses[poseKey].expressions) store.poses[poseKey].expressions = {};
        if (!store.poses[poseKey].expressions[exprKey]) return;
        store.poses[poseKey].expressions[exprKey][part] = dataUrl;
        this._saveToStorage();
    },

    getExpressionPart: function(charId, poseKey, exprKey, part) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses || !store.poses[poseKey]) return null;
        if (!store.poses[poseKey].expressions) return null;
        if (!store.poses[poseKey].expressions[exprKey]) return null;
        return store.poses[poseKey].expressions[exprKey][part] || null;
    },

    // ---- HELPERS ----
    hasImages: function(charId) {
        var store = this._getCharStore(charId);
        if (!store || !store.poses) return false;
        var poseKeys = Object.keys(store.poses);
        for (var i = 0; i < poseKeys.length; i++) {
            var p = store.poses[poseKeys[i]];
            if (!p) continue;
            if (p.base) return true;
            if (p.clothing && Object.keys(p.clothing).length > 0) return true;
        }
        return false;
    },

    clearCharacter: function(charId) {
        var p = ProjectManager.getActive();
        if (!p) return;
        if (this._imageStore[p.id]) {
            delete this._imageStore[p.id][charId];
            this._saveToStorage();
        }
    },

    readFileAsDataURL: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    compressImage: function(dataUrl, maxWidth, maxHeight, quality) {
        maxWidth = maxWidth || 1000;
        maxHeight = maxHeight || 700;
        quality = quality || 1;
        return new Promise(function(resolve) {
            var img = new Image();
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                var w = img.width, h = img.height;
                if (w > maxWidth) { h = h * (maxWidth / w); w = maxWidth; }
                if (h > maxHeight) { w = w * (maxHeight / h); h = maxHeight; }
                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(img, 0, 0, w, h);
                // Always use PNG to preserve transparency
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = dataUrl;
        });
    },

    exportForProject: function(projectId) {
        return JSON.parse(JSON.stringify(this._imageStore[projectId] || {}));
    },

    importForProject: function(projectId, imageData) {
        if (imageData && Object.keys(imageData).length > 0) {
            this._imageStore[projectId] = JSON.parse(JSON.stringify(imageData));
            this._saveToStorage();
        }
    },

    // ---- STORAGE (localForage / IndexedDB) ----
    _saveToStorage: function() {
        if (typeof localforage !== 'undefined') {
            localforage.setItem('savida_images', this._imageStore).catch(function(e) {
                console.warn('Image storage error:', e);
            });
        } else {
            // Fallback to localStorage
            try {
                localStorage.setItem('savida_images', JSON.stringify(this._imageStore));
            } catch(e) {
                console.warn('localStorage full. Add localforage.js for IndexedDB support.');
            }
        }
    },

    _loadFromStorage: function() {
        var self = this;
        if (typeof localforage !== 'undefined') {
            localforage.getItem('savida_images').then(function(data) {
                if (data) { self._imageStore = data; }
            }).catch(function() {
                self._imageStore = {};
            });
        } else {
            // Fallback to localStorage
            try {
                var data = localStorage.getItem('savida_images');
                if (data) { self._imageStore = JSON.parse(data); }
            } catch(e) {
                self._imageStore = {};
            }
        }
    }
};