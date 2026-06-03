var UI = {
    modalContent: '', modalFilename: 'export.js', modalType: 'text/javascript',
    showModal: function(title, content, filename, type) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').textContent = content;
        document.getElementById('modal-overlay').classList.add('show');
        this.modalContent = content;
        this.modalFilename = filename || 'export.js';
        this.modalType = type || 'text/javascript';
    },
    closeModal: function() { document.getElementById('modal-overlay').classList.remove('show'); },
    downloadModal: function() {
        var blob = new Blob([this.modalContent], { type: this.modalType });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = this.modalFilename; a.click();
    },
    toggleDropdown: function(ddId) {
        var dd = document.getElementById(ddId); if (!dd) return;
        var isOpen = dd.classList.contains('open');
        document.querySelectorAll('.toolbar-dropdown.open').forEach(function(el) { el.classList.remove('open'); });
        if (!isOpen) { dd.classList.add('open'); setTimeout(function() { document.addEventListener('click', UI._closeDropdowns); }, 10); }
    },
    _closeDropdowns: function(e) {
        if (!e.target.closest('.toolbar-dropdown')) {
            document.querySelectorAll('.toolbar-dropdown.open').forEach(function(el) { el.classList.remove('open'); });
            document.removeEventListener('click', UI._closeDropdowns);
        }
    }
};

var App = {
    init: function() {
        ProjectManager.init();
        Canvas.init();
        this.bindKeyboard();
        this.bindModalClose();
        LeftPanel.render();
        Sidebar.render();
        Utils.updateToolbarButtons(false);
    },

    loadProjectToEditor: function() {
        var p = ProjectManager.getActive();
        if (!p) {
            Canvas.nodes = []; Canvas.connections = []; Canvas.nodeIdCounter = 0;
            Canvas.selectedNodeId = null;
            if (Canvas.nodesLayer) Canvas.nodesLayer.innerHTML = '';
            if (Canvas.ctx) Canvas.ctx.clearRect(0, 0, Canvas.lineCanvas.width, Canvas.lineCanvas.height);
            LeftPanel.render(); Sidebar.render(); Utils.updateToolbarButtons(false);
            return;
        }
        Canvas.nodes = (p.scenes || []).map(function(s) {
            return { id:s.id, type:'scene', x:s.x||200, y:s.y||200, title:s.title||s.id, subtitle:s.subtitle||'', text:s.text||'', choices:s.choices||[], extraTags:s.extraTags||{} };
        });
        Object.keys(p.endings||{}).forEach(function(id) {
            var e = p.endings[id];
            Canvas.nodes.push({ id:id, type:'ending', x:e.x||600, y:e.y||200, title:e.title||id, emoji:e.emoji||'⭐', text:e.desc||'', color:e.color||'#880030' });
        });
        Canvas.connections = p.connections || [];
        Canvas.nodeIdCounter = p.nodeIdCounter || Canvas.nodes.length;
        Canvas.selectedNodeId = null;
        if (Canvas.nodesLayer) Canvas.nodesLayer.innerHTML = '';
        Canvas.nodes.forEach(function(n) { Canvas.renderNode(n); });
        Canvas.drawConnections(); Canvas.applyZoomTransform(); Canvas.updateZoomDisplay();
        LeftPanel.render(); Sidebar.render(); Utils.updateToolbarButtons(!!p);
        if (Canvas.nodes.length === 0) {
            Canvas.addNode('scene'); Canvas.addNode('ending');
            if (Canvas.nodes.length >= 2) {
                Canvas.connections.push({ fromNodeId:Canvas.nodes[0].id, fromChoiceIndex:0, toNodeId:Canvas.nodes[1].id });
                Canvas.renderNode(Canvas.nodes[0]); Canvas.drawConnections();
            }
        }
    },

    // Sync canvas state into the active project (does NOT save to disk)
    _syncCanvasToProject: function() {
        var p = ProjectManager.getActive();
        if (!p) return;
        p.scenes = Canvas.nodes.filter(function(n){return n.type==='scene';}).map(function(n){
            return { id:n.id, x:n.x, y:n.y, title:n.title, subtitle:n.subtitle, text:n.text, choices:n.choices, extraTags:n.extraTags };
        });
        p.endings = {};
        Canvas.nodes.filter(function(n){return n.type==='ending';}).forEach(function(n){
            p.endings[n.id] = { x:n.x, y:n.y, emoji:n.emoji, title:n.title, desc:n.text, color:n.color };
        });
        p.connections = Canvas.connections;
        p.nodeIdCounter = Canvas.nodeIdCounter;
    },

    save: function() {
        this._syncCanvasToProject();
        ProjectManager.saveActiveProject().catch(function(err){ console.error('Save failed:', err); });
    },

    saveAs: function() {
        this._syncCanvasToProject();
        ProjectManager.saveActiveProjectAs().catch(function(err){ console.error('Save As failed:', err); });
    },

    createProject: function() {
        var name = prompt('Project name:', 'New Story');
        if (name) { ProjectManager.createProject(name.trim()||'Untitled'); this.loadProjectToEditor(); }
    },

    renameProjectPrompt: function(id) {
        var p = ProjectManager.projects.find(function(pr){return pr.id===id;});
        if (!p) return;
        var n = prompt('Rename:', p.name);
        if (n && n.trim()) ProjectManager.renameProject(id, n.trim());
    },

    bindKeyboard: function() {
        var self = this;
        window.addEventListener('keydown', function(e) {
            // Ctrl+Alt+S = Save As (avoids Edge screenshot conflict)
            if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                self.saveAs();
                return;
            }
            // Ctrl+S = Save
            if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                self.save();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); Canvas.zoomIn(); }
            if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); Canvas.zoomOut(); }
            if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); Canvas.setZoom(1); }
        });
    },

    bindModalClose: function() {
        var overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) UI.closeModal(); });
    }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });