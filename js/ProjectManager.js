var ProjectManager = {
    projects: [],
    activeProjectId: null,
    saveDirectory: null,
    hasFileSystem: false,
    _initialized: false,

    init: function() {
        if (this._initialized) return;
        this._initialized = true;
        
        this.hasFileSystem = (typeof window.showDirectoryPicker === 'function');
        this.projects = [];
        this.activeProjectId = null;
        this.renderTabs();
        this._initDragDrop();
        
        if (!this.hasFileSystem) {
            this._showBrowserWarning();
            return;
        }
        
        this._restoreLastSession();
    },

    _showBrowserWarning: function() {
        var container = document.getElementById('left-content');
        if (container) {
            container.innerHTML = '<div class="no-project-msg">' +
                '⚠️<br>This app requires <b>Chrome, Edge, or Opera</b><br>' +
                'for file system access.<br><br>' +
                'Use <b>📁 File → Select Save Folder</b><br>to get started.</div>';
        }
    },

    // ---- SESSION ----
    _saveSession: function() {
        var session = {
            activeProjectId: this.activeProjectId,
            projectNames: this.projects.map(function(p) { return p.name; }),
            timestamp: new Date().toISOString()
        };
        if (this.saveDirectory) session.folderName = this.saveDirectory.name;
        try { localStorage.setItem('savida_last_session', JSON.stringify(session)); } catch(e) {}
    },

    _restoreLastSession: async function() {
        try {
            var data = localStorage.getItem('savida_last_session');
            if (!data) { this._showWelcomePrompt(); return; }
            var session = JSON.parse(data);
            await new Promise(function(r) { setTimeout(r, 100); });
            
            var reopen = confirm(
                '📁 Reopen last project folder?\n\n' +
                'Folder: ' + (session.folderName || 'Unknown') + '\n' +
                'Projects: ' + (session.projectNames || []).join(', ') + '\n' +
                'Last saved: ' + new Date(session.timestamp).toLocaleString() + '\n\n' +
                'OK = reopen | Cancel = start fresh'
            );
            
            if (reopen) {
                await this._reopenFolder(session);
            } else {
                localStorage.removeItem('savida_last_session');
                this._showWelcomePrompt();
            }
        } catch(e) {
            localStorage.removeItem('savida_last_session');
            this._showWelcomePrompt();
        }
    },

    _showWelcomePrompt: function() {
        var container = document.getElementById('left-content');
        if (container) {
            container.innerHTML = '<div class="no-project-msg">' +
                '👋<br>Welcome!<br><br>' +
                'Use <b>📁 File → Select Save Folder</b><br>' +
                'to open or create a project.<br><br>' +
                '<button class="btn-sm-add" onclick="ProjectManager.pickSaveFolder()" style="font-size:12px;padding:8px 16px;cursor:pointer;">' +
                '📂 Select Folder</button></div>';
        }
        var cw = document.getElementById('canvas-wrap');
        if (cw) {
            var ex = cw.querySelector('.welcome-msg'); if (ex) ex.remove();
            var m = document.createElement('div');
            m.className = 'welcome-msg';
            m.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:var(--dim);font-size:18px;pointer-events:none;z-index:5;';
            m.innerHTML = '📁<br><span style="font-size:14px;">Select a project folder to begin</span>';
            cw.appendChild(m);
        }
    },

    _hideWelcomeMessage: function() {
        var cw = document.getElementById('canvas-wrap');
        if (cw) { var m = cw.querySelector('.welcome-msg'); if (m) m.remove(); }
    },

    _reopenFolder: async function(session) {
        try {
            this.saveDirectory = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
            await this._loadProjectsFromDirectory(this.saveDirectory);
            this.renderTabs();
            if (session.activeProjectId) {
                var found = this.projects.find(function(p) { return p.id === session.activeProjectId; });
                this.activeProjectId = found ? found.id : (this.projects[0] ? this.projects[0].id : null);
            } else if (this.projects.length > 0) {
                this.activeProjectId = this.projects[0].id;
            }
            if (this.projects.length === 0) this.createProject('My First Story');
            this._saveSession();
            this._hideWelcomeMessage();
            App.loadProjectToEditor();
            Utils.updateToolbarButtons(true);
        } catch(e) {
            if (e.name !== 'AbortError') console.error(e);
            this._showWelcomePrompt();
        }
    },

    // ---- FOLDER SELECTION ----
    pickSaveFolder: async function() {
        if (!this.hasFileSystem) { alert('Requires Chrome, Edge, or Opera.'); return; }
        try {
            this.saveDirectory = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
            await this._loadProjectsFromDirectory(this.saveDirectory);
            this.renderTabs();
            if (this.projects.length > 0) {
                this.activeProjectId = this.projects[0].id;
            } else {
                this.createProject('My First Story');
            }
            this._saveSession();
            this._hideWelcomeMessage();
            App.loadProjectToEditor();
            Utils.updateToolbarButtons(true);
            Utils.showSaveIndicator();
        } catch(e) { if (e.name !== 'AbortError') console.error(e); }
    },

    // ---- SAVE ----
    saveActiveProject: async function() {
        if (!this.saveDirectory) {
            await this.pickSaveFolder();
            if (!this.saveDirectory) return;
        }
        var project = this.getActive();
        if (!project) return;
        
        App._syncCanvasToProject();
        
        // EMBED IMAGES INTO PROJECT DATA
        if (typeof ImageManager !== 'undefined') {
            project.images = ImageManager.exportForProject(project.id);
        }
        
        project.updatedAt = new Date().toISOString();
        try {
            await this._writeProjectFile(project);
            this._saveSession();
            Utils.showSaveIndicator();
        } catch(e) {
            console.error('Save error:', e);
            alert('Could not save: ' + e.message);
        }
    },

    _writeProjectFile: async function(project) {
        if (!this.saveDirectory) throw new Error('No save directory');
        var filename = this._sanitizeFilename(project.name) + '.story.json';
        var content = JSON.stringify(project, null, 2);
        var fileHandle = await this.saveDirectory.getFileHandle(filename, { create: true });
        var writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    },

    // ---- DRAG AND DROP ----
    _initDragDrop: function() {
        var self = this;
        var body = document.body;
        var dragCounter = 0;

        body.addEventListener('dragenter', function(e) {
            e.preventDefault(); e.stopPropagation();
            dragCounter++;
            body.classList.add('drag-over');
        });
        body.addEventListener('dragleave', function(e) {
            e.preventDefault(); e.stopPropagation();
            dragCounter--;
            if (dragCounter <= 0) { dragCounter = 0; body.classList.remove('drag-over'); }
        });
        body.addEventListener('dragover', function(e) { e.preventDefault(); e.stopPropagation(); });
        
        body.addEventListener('drop', async function(e) {
            e.preventDefault(); e.stopPropagation();
            dragCounter = 0;
            body.classList.remove('drag-over');

            var files = e.dataTransfer.files;
            if (files.length === 0) return;

            var jsonFiles = [];
            for (var i = 0; i < files.length; i++) {
                var f = files[i];
                if (f.name.endsWith('.story.json') || f.name.endsWith('.json') || f.type === 'application/json') {
                    jsonFiles.push(f);
                }
            }
            if (jsonFiles.length === 0) {
                self._showToast('⚠️ No .story.json files found.', 'warning');
                return;
            }

            var imported = 0, failed = 0;
            self._showToast('📥 Importing ' + jsonFiles.length + ' file(s)...', 'info');

            for (var j = 0; j < jsonFiles.length; j++) {
                try {
                    var text = await self._readFileAsText(jsonFiles[j]);
                    var project = JSON.parse(text);
                    if (project.id && project.config && project.scenes !== undefined) {
                        var existing = self.projects.find(function(p) { return p.id === project.id; });
                        if (existing) {
                            project.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
                            if (project.name) project.name = project.name + ' (Imported)';
                        }
                        // RESTORE IMAGES FROM DROPPED FILE
                        if (project.images && typeof ImageManager !== 'undefined') {
                            ImageManager.importForProject(project.id, project.images);
                        }
                        self.projects.push(project);
                        self.activeProjectId = project.id;
                        imported++;
                    } else { failed++; }
                } catch(err) { failed++; }
            }

            self.renderTabs();
            App.loadProjectToEditor();
            Utils.updateToolbarButtons(true);
            self._hideWelcomeMessage();

            if (imported > 0) {
                self._showToast('✅ Imported ' + imported + ' project(s). Press Ctrl+S to save.', 'success');
            } else {
                self._showToast('❌ No valid projects found.', 'error');
            }
        });
    },

    _readFileAsText: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    _showToast: function(message, type) {
        var existing = document.querySelector('.drop-toast');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        var toast = document.createElement('div');
        toast.className = 'drop-toast';
        toast.textContent = message;
        var bg = 'rgba(46,204,113,0.9)';
        if (type === 'warning') bg = 'rgba(240,192,64,0.9)';
        if (type === 'error') bg = 'rgba(255,48,80,0.9)';
        if (type === 'info') bg = 'rgba(52,152,219,0.9)';
        toast.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:'+bg+';color:#fff;padding:10px 24px;border-radius:20px;font-size:13px;font-weight:600;z-index:500;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.4);animation:toastIn 0.3s ease-out;';
        document.body.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity='0';toast.style.transition='opacity 0.3s';
            setTimeout(function(){if(toast.parentNode)toast.parentNode.removeChild(toast);},300);
        },2500);
    },

    _sanitizeFilename: function(name) {
        return name.replace(/[^a-zA-Z0-9 _-]/g,'').substring(0,60)||'untitled';
    },

    _loadProjectsFromDirectory: async function(dir) {
        this.projects = [];
        for await (var entry of dir.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.story.json')) {
                try {
                    var file = await entry.getFile();
                    var text = await file.text();
                    var project = JSON.parse(text);
                    if (project.id && project.config && project.scenes !== undefined) {
                        // RESTORE IMAGES WHEN LOADING FROM FOLDER
                        if (project.images && typeof ImageManager !== 'undefined') {
                            ImageManager.importForProject(project.id, project.images);
                        }
                        this.projects.push(project);
                    }
                } catch(e) {}
            }
        }
        this.projects.sort(function(a,b){ return (b.updatedAt||'').localeCompare(a.updatedAt||''); });
    },

    _deleteProjectFile: async function(project) {
        if (!this.saveDirectory) return;
        try { await this.saveDirectory.removeEntry(this._sanitizeFilename(project.name)+'.story.json'); } catch(e) {}
    },

    // ---- PROJECT CRUD ----
    createProject: function(name) {
        name = name || 'Untitled Story';
        var id = 'proj_' + Date.now();
        var project = {
            id:id, name:name,
            config:{
                title:name, subtitle:'A branching tale.',
                characters:[
                    this._createCharacter('Maya','standardGirl','protagonist'),
                    this._createCharacter('Leo','standardBoy','companion')
                ],
                stats:[
                    {id:'c',name:'Corruption',emoji:'💔',start:0,min:0,max:100,color:'#ff4060'},
                    {id:'p',name:'Purity',emoji:'✨',start:100,min:0,max:100,color:'#8090e0'},
                    {id:'d',name:'Broken',emoji:'😳',start:0,min:0,max:100,color:'#d4a040'}
                ],
                extraSettings:{enableSexActs:true,enableEnslavement:true}
            },
            scenes:[],endings:{},connections:[],nodeIdCounter:0,
            images:{},
            createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
        };
        this.projects.push(project);
        this.activeProjectId = project.id;
        this.renderTabs();
        this._saveSession();
        if (this.saveDirectory) this._writeProjectFile(project);
        return project;
    },

    _createCharacter: function(name, classPreset, role) {
        var char = {
            id:'char_'+Date.now()+'_'+Math.random().toString(36).substr(2,4),
            name:name||'Character', role:role||'neutral',
            classPreset:classPreset||'custom', icon:'🧑',
            clothing:['top','bottom'], states:['Normal'], defaultState:'Normal',
            bodyParts:{oral:{icon:'👄',label:'Oral',enabled:true}}
        };
        if (classPreset && classPreset !== 'custom') CharacterClasses.applyPreset(char, classPreset);
        return char;
    },

    getActive: function() {
        var self = this;
        return this.projects.find(function(p){return p.id===self.activeProjectId;});
    },

    setActive: function(id) {
        this.activeProjectId = id; this.renderTabs(); this._saveSession();
        if (typeof App !== 'undefined') App.loadProjectToEditor();
    },

    deleteProject: function(id) {
        if (this.projects.length <= 1) { alert('Cannot delete last project.'); return; }
        var project = this.projects.find(function(p){return p.id===id;});
        this.projects = this.projects.filter(function(p){return p.id!==id;});
        if (this.activeProjectId === id) this.activeProjectId = this.projects[0] ? this.projects[0].id : null;
        if (this.saveDirectory && project) this._deleteProjectFile(project);
        this._saveSession(); this.renderTabs();
        if (this.activeProjectId && typeof App !== 'undefined') App.loadProjectToEditor();
    },

    renameProject: function(id, newName) {
        var p = this.projects.find(function(pr){return pr.id===id;});
        if (!p) return;
        var oldName = p.name; p.name = newName; p.config.title = newName;
        p.updatedAt = new Date().toISOString();
        this.renderTabs(); this._saveSession();
        if (this.saveDirectory) {
            var self = this;
            this._deleteProjectFile({name:oldName}).then(function(){self._writeProjectFile(p);});
        }
    },

    updateConfig: function(key, value) { var p=this.getActive(); if(p) p.config[key]=value; },
    updateCharacterField: function(i, key, value) { var p=this.getActive(); if(p&&p.config.characters[i]) p.config.characters[i][key]=value; },
    setCharacterClass: function(i, preset) {
        var p=this.getActive(); if(!p||!p.config.characters[i]) return;
        if (preset==='custom') p.config.characters[i].classPreset='custom';
        else CharacterClasses.applyPreset(p.config.characters[i], preset);
    },
    saveProjectData: function(data) {
        var p=this.getActive(); if(!p)return;
        Object.keys(data).forEach(function(k){p[k]=data[k];});
        p.updatedAt=new Date().toISOString();
    },

    downloadProjectFile: function() {
        var project = this.getActive(); if (!project) return;
        App._syncCanvasToProject();
        // Embed images
        if (typeof ImageManager !== 'undefined') {
            project.images = ImageManager.exportForProject(project.id);
        }
        project.updatedAt = new Date().toISOString();
        var content = JSON.stringify(project, null, 2);
        var blob = new Blob([content], {type:'application/json'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = this._sanitizeFilename(project.name) + '.story.json';
        a.click(); URL.revokeObjectURL(a.href);
    },

    importProjectFile: function(event) {
        var file = event.target.files[0]; if (!file) return;
        var self = this;
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var project = JSON.parse(e.target.result);
                if (!project.id || !project.config || project.scenes === undefined) { alert('Invalid file.'); return; }
                var existing = self.projects.find(function(p){return p.id===project.id;});
                if (existing) {
                    if (!confirm('Duplicate ID. Overwrite?')) {
                        project.id = 'proj_' + Date.now();
                        project.name = (project.name||'Imported') + ' (Copy)';
                    } else {
                        self.projects = self.projects.filter(function(p){return p.id!==project.id;});
                    }
                }
                // RESTORE IMAGES
                if (project.images && typeof ImageManager !== 'undefined') {
                    ImageManager.importForProject(project.id, project.images);
                }
                self.projects.push(project); self.activeProjectId = project.id;
                self.renderTabs(); self._saveSession();
                App.loadProjectToEditor();
                if (self.saveDirectory) self._writeProjectFile(project);
                Utils.showSaveIndicator();
            } catch(err) { alert('Error: ' + err.message); }
        };
        reader.readAsText(file); event.target.value = '';
    },

    renderTabs: function() {
        var bar = document.getElementById('tab-bar'); if (!bar) return;
        bar.innerHTML = '';
        var self = this;
        this.projects.forEach(function(p) {
            var tab = document.createElement('div');
            tab.className = 'tab' + (p.id === self.activeProjectId ? ' active' : '');
            tab.innerHTML = '<span ondblclick="event.stopPropagation();App.renameProjectPrompt(\''+p.id+'\')" title="Double-click to rename">' +
                Utils.escHtml(p.name) + '</span><span class="close-tab" onclick="event.stopPropagation();ProjectManager.deleteProject(\''+p.id+'\')">×</span>';
            tab.addEventListener('click', function() { self.setActive(p.id); });
            bar.appendChild(tab);
        });
        var addBtn = document.createElement('div');
        addBtn.className = 'add-tab'; addBtn.textContent = '+'; addBtn.title = 'New Project';
        addBtn.addEventListener('click', function() { self.createProject(); });
        bar.appendChild(addBtn);
    },

    hasActiveFolder: function() { return !!this.saveDirectory; }
};