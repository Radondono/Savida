var Utils = {
    escHtml: function(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    },
    generateId: function(prefix) {
        return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    },
    showSaveIndicator: function() {
        var el = document.getElementById('save-indicator');
        if (!el) return;
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 1500);
    },
    updateToolbarButtons: function(hasProject) {
        ['btnAddScene','btnAddEnding','btnSave','btnExport','btnExportHTML','btnClear','btnPreview'].forEach(function(id) {
            var btn = document.getElementById(id);
            if (btn) btn.disabled = !hasProject;
        });
    },
};