var ImageManager = {
    _imageStore: {},

    init: function() {
        this._loadFromStorage();
    },

    _getCharStore: function(charId) {
        var p = ProjectManager.getActive();
        if (!p) return null;
        if (!this._imageStore[p.id]) this._imageStore[p.id] = {};
        if (!this._imageStore[p.id][charId]) this._imageStore[p.id][charId] = { base: null, clothing: {} };
        return this._imageStore[p.id][charId];
    },

    setBaseImage: function(charId, dataUrl) {
        var store = this._getCharStore(charId);
        if (store) {
            store.base = dataUrl;
            this._saveToStorage();
        }
    },

    getBaseImage: function(charId) {
        var store = this._getCharStore(charId);
        return store ? store.base : null;
    },

    setClothingImage: function(charId, clothName, dataUrl) {
        var store = this._getCharStore(charId);
        if (store) {
            store.clothing[clothName] = dataUrl;
            this._saveToStorage();
        }
    },

    getClothingImage: function(charId, clothName) {
        var store = this._getCharStore(charId);
        return (store && store.clothing && store.clothing[clothName]) ? store.clothing[clothName] : null;
    },

    removeClothingImage: function(charId, clothName) {
        var store = this._getCharStore(charId);
        if (store && store.clothing && store.clothing[clothName]) {
            delete store.clothing[clothName];
            this._saveToStorage();
        }
    },

    removeBaseImage: function(charId) {
        var store = this._getCharStore(charId);
        if (store) {
            store.base = null;
            this._saveToStorage();
        }
    },

    getClothingImages: function(charId) {
        var store = this._getCharStore(charId);
        return (store && store.clothing) ? store.clothing : {};
    },

    hasImages: function(charId) {
        var store = this._getCharStore(charId);
        if (!store) return false;
        var hasBase = !!store.base;
        var hasClothing = store.clothing && Object.keys(store.clothing).length > 0;
        return hasBase || hasClothing;
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
        maxWidth = maxWidth || 400;
        maxHeight = maxHeight || 600;
        quality = quality || 0.8;
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
                resolve(canvas.toDataURL('image/png', quality));
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

    _saveToStorage: function() {
        try {
            localStorage.setItem('savida_images', JSON.stringify(this._imageStore));
        } catch(e) {
            console.warn('Image storage full.');
        }
    },

    _loadFromStorage: function() {
        try {
            var data = localStorage.getItem('savida_images');
            if (data) {
                this._imageStore = JSON.parse(data);
            }
        } catch(e) {
            this._imageStore = {};
        }
    }
};