var ImageManager = {
    // Store images as base64 data URIs
    // Structure: { projectId: { charId: { base: "data:image/png;base64,...", clothing: { clothName: "data:image/png;base64,..." } } } }
    _imageStore: {},

    init: function() {
        this._loadFromStorage();
    },

    // Get or create image store for a character
    _getCharStore: function(charId) {
        var p = ProjectManager.getActive();
        if (!p) return null;
        if (!this._imageStore[p.id]) this._imageStore[p.id] = {};
        if (!this._imageStore[p.id][charId]) this._imageStore[p.id][charId] = { base: null, clothing: {} };
        return this._imageStore[p.id][charId];
    },

    // Set base image (naked character)
    setBaseImage: function(charId, dataUrl) {
        var store = this._getCharStore(charId);
        if (store) {
            store.base = dataUrl;
            this._saveToStorage();
        }
    },

    // Get base image
    getBaseImage: function(charId) {
        var store = this._getCharStore(charId);
        return store ? store.base : null;
    },

    // Set clothing image
    setClothingImage: function(charId, clothName, dataUrl) {
        var store = this._getCharStore(charId);
        if (store) {
            store.clothing[clothName] = dataUrl;
            this._saveToStorage();
        }
    },

    // Get clothing image
    getClothingImage: function(charId, clothName) {
        var store = this._getCharStore(charId);
        return (store && store.clothing[clothName]) ? store.clothing[clothName] : null;
    },

    // Remove clothing image
    removeClothingImage: function(charId, clothName) {
        var store = this._getCharStore(charId);
        if (store && store.clothing[clothName]) {
            delete store.clothing[clothName];
            this._saveToStorage();
        }
    },

    // Remove base image
    removeBaseImage: function(charId) {
        var store = this._getCharStore(charId);
        if (store) {
            store.base = null;
            this._saveToStorage();
        }
    },

    // Get all clothing images for a character
    getClothingImages: function(charId) {
        var store = this._getCharStore(charId);
        return store ? store.clothing : {};
    },

    // Get ordered clothing layers (matching character's clothing array order)
    getOrderedClothingLayers: function(charId) {
        var p = ProjectManager.getActive();
        if (!p) return [];
        var char = (p.config.characters || []).find(function(c) { return c.id === charId; });
        if (!char) return [];
        var store = this._getCharStore(charId);
        if (!store) return [];
        var layers = [];
        (char.clothing || []).forEach(function(clothName) {
            if (store.clothing[clothName]) {
                layers.push({ name: clothName, dataUrl: store.clothing[clothName] });
            }
        });
        return layers;
    },

    // Check if a character has any images
    hasImages: function(charId) {
        var store = this._getCharStore(charId);
        if (!store) return false;
        return !!store.base || Object.keys(store.clothing).length > 0;
    },

    // Clear all images for a character
    clearCharacter: function(charId) {
        var p = ProjectManager.getActive();
        if (!p) return;
        if (this._imageStore[p.id]) {
            delete this._imageStore[p.id][charId];
            this._saveToStorage();
        }
    },

    // Read a file and return as data URL
    readFileAsDataURL: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    // Compress and resize image to save storage space
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

    _saveToStorage: function() {
        try {
            localStorage.setItem('savida_images', JSON.stringify(this._imageStore));
        } catch(e) {
            console.warn('Image storage full. Some images may not be saved.');
            // Try to free space by compressing
            this._compactStorage();
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
    },

    _compactStorage: function() {
        // Remove images for deleted projects
        var self = this;
        var activeProjects = ProjectManager.projects.map(function(p) { return p.id; });
        Object.keys(this._imageStore).forEach(function(projId) {
            if (activeProjects.indexOf(projId) === -1) {
                delete self._imageStore[projId];
            }
        });
        this._saveToStorage();
    },

   // Export all images for a project
    exportForProject: function(projectId) {
        return JSON.parse(JSON.stringify(this._imageStore[projectId] || {}));
    },

    // Import images from project data
    importForProject: function(projectId, imageData) {
        if (imageData && Object.keys(imageData).length > 0) {
            this._imageStore[projectId] = JSON.parse(JSON.stringify(imageData));
            this._saveToStorage();
        }
    },
};