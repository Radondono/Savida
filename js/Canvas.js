var Canvas = {
    nodes: [],
    connections: [],
    nodeIdCounter: 0,
    selectedNodeId: null,
    dragging: null,
    dragOffset: { x: 0, y: 0 },
    panning: false,
    panStart: { x: 0, y: 0 },
    connecting: null,
    mousePos: { x: 0, y: 0 },
    zoomLevel: 1,
    minZoom: 0.2,
    maxZoom: 3,

    init: function() {
        this.canvasWrap = document.getElementById('canvas-wrap');
        this.nodesLayer = document.getElementById('nodes-layer');
        this.lineCanvas = document.getElementById('lineCanvas');
        this.ctx = this.lineCanvas.getContext('2d');
        this.resize();
        this.bindEvents();
        window.addEventListener('resize', this.resize.bind(this));
        this.animLoop();
        this.updateZoomDisplay();
    },

    resize: function() {
        this.lineCanvas.width = this.canvasWrap.clientWidth;
        this.lineCanvas.height = this.canvasWrap.clientHeight;
        this.applyZoomTransform();
        this.drawConnections();
    },

    // ---- ZOOM ----
    setZoom: function(level) {
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
        this.applyZoomTransform();
        this.drawConnections();
        this.updateZoomDisplay();
    },

    zoomIn: function() {
        this.setZoom(this.zoomLevel * 1.2);
    },

    zoomOut: function() {
        this.setZoom(this.zoomLevel / 1.2);
    },

    zoomToFit: function() {
        if (this.nodes.length === 0) { this.setZoom(1); return; }
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.nodes.forEach(function(n) {
            if (n.x < minX) minX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.x + 250 > maxX) maxX = n.x + 250;
            if (n.y + 200 > maxY) maxY = n.y + 200;
        });
        var w = maxX - minX + 100;
        var h = maxY - minY + 100;
        var zx = this.canvasWrap.clientWidth / w;
        var zy = this.canvasWrap.clientHeight / h;
        this.setZoom(Math.min(zx, zy, 1.5));
    },

    applyZoomTransform: function() {
        this.nodesLayer.style.transformOrigin = '0 0';
        this.nodesLayer.style.transform = 'scale(' + this.zoomLevel + ')';
        this.lineCanvas.style.transformOrigin = '0 0';
        this.lineCanvas.style.transform = 'scale(' + this.zoomLevel + ')';
    },

    updateZoomDisplay: function() {
        var el = document.getElementById('zoom-level');
        if (el) el.textContent = Math.round(this.zoomLevel * 100) + '%';
    },

    // ---- SCREEN / CANVAS COORDINATES ----
    screenToCanvas: function(sx, sy) {
        var rect = this.canvasWrap.getBoundingClientRect();
        return {
            x: (sx - rect.left) / this.zoomLevel,
            y: (sy - rect.top) / this.zoomLevel
        };
    },

    // ---- EVENTS ----
    bindEvents: function() {
        var self = this;

        // Mouse wheel zoom
        this.canvasWrap.addEventListener('wheel', function(e) {
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) {
                var delta = -e.deltaY * 0.005;
                self.setZoom(self.zoomLevel * (1 + delta));
            }
        }, { passive: false });

        this.canvasWrap.addEventListener('mousedown', function(e) {
            // Middle mouse button = pan
            if (e.button === 1) {
                e.preventDefault();
                self.panning = true;
                self.panStart.x = e.clientX;
                self.panStart.y = e.clientY;
                self.canvasWrap.classList.add('panning');
                return;
            }
            if (e.target === self.canvasWrap || e.target === self.lineCanvas) {
                self.panning = true;
                self.panStart.x = e.clientX;
                self.panStart.y = e.clientY;
                self.canvasWrap.classList.add('panning');
                self.selectedNodeId = null;
                document.querySelectorAll('.node.selected').forEach(function(el) { el.classList.remove('selected'); });
                if (typeof Sidebar !== 'undefined') Sidebar.render();
            }
        });

        window.addEventListener('mousemove', function(e) {
            self.mousePos.x = e.clientX;
            self.mousePos.y = e.clientY;
            if (self.dragging) {
                var pos = self.screenToCanvas(e.clientX, e.clientY);
                self.dragging.x = pos.x - self.dragOffset.x;
                self.dragging.y = pos.y - self.dragOffset.y;
                var el = document.getElementById(self.dragging.id);
                if (el) { el.style.left = self.dragging.x + 'px'; el.style.top = self.dragging.y + 'px'; }
                self.drawConnections();
            }
            if (self.panning) {
                var dx = (e.clientX - self.panStart.x) / self.zoomLevel;
                var dy = (e.clientY - self.panStart.y) / self.zoomLevel;
                self.nodes.forEach(function(n) { n.x += dx; n.y += dy; });
                document.querySelectorAll('.node').forEach(function(el) {
                    var n = self.getNode(el.id);
                    if (n) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; }
                });
                self.panStart.x = e.clientX;
                self.panStart.y = e.clientY;
                self.drawConnections();
            }
        });

        window.addEventListener('mouseup', function(e) {
            if (self.dragging) { self.dragging = null; self.drawConnections(); self.saveState(); }
            if (self.panning) { self.panning = false; self.canvasWrap.classList.remove('panning'); }
            if (self.connecting && !(e.target && e.target.closest && e.target.closest('.node'))) {
                self.connecting = null;
                document.querySelectorAll('.socket.connecting').forEach(function(s) { s.classList.remove('connecting'); });
                self.drawConnections();
            }
        });

        // Prevent middle-click default
        this.canvasWrap.addEventListener('auxclick', function(e) { e.preventDefault(); });
    },

    // ---- NODE OPERATIONS ----
    addNode: function(type) {
        var id = 'node_' + (this.nodeIdCounter++);
        var node = {
            id: id, type: type,
            x: (150 + this.nodes.length * 25) / this.zoomLevel,
            y: (120 + this.nodes.length * 20) / this.zoomLevel,
            title: type === 'scene' ? 'Scene ' + (this.nodes.filter(function(n) { return n.type === 'scene'; }).length + 1) :
                   'Ending ' + (this.nodes.filter(function(n) { return n.type === 'ending'; }).length + 1),
            subtitle: '',
            text: type === 'scene' ? 'Describe this scene...' : 'What happens in this ending...',
            choices: type === 'scene' ? [this.makeDefaultChoice()] : [],
            emoji: '⭐',
            color: '#880030',
            extraTags: {}
        };
        this.nodes.push(node);
        this.renderNode(node);
        this.drawConnections();
        this.selectNode(id);
        this.saveState();
        return node;
    },

    makeDefaultChoice: function() {
        var ch = {
            text: 'Option A',
            sex: false, corrupt: false,
            mayaOral: 0, leoOral: 0, mayaVaginal: 0, mayaAnal: 0, leoAnal: 0,
            enslaveSis: false, enslaveBro: false
        };
        var p = ProjectManager.getActive();
        if (p) {
            (p.config.stats || []).forEach(function(s) { ch[s.id] = 0; });
            (p.config.characters || []).forEach(function(c) {
                ch['strip_' + c.id] = null;
                ch['state_' + c.id] = c.defaultState || 'Normal';
            });
        }
        return ch;
    },

    getNode: function(id) {
        return this.nodes.find(function(n) { return n.id === id; });
    },

    selectNode: function(id) {
        this.selectedNodeId = id;
        document.querySelectorAll('.node.selected').forEach(function(el) { el.classList.remove('selected'); });
        var el = document.getElementById(id);
        if (el) el.classList.add('selected');
        if (typeof Sidebar !== 'undefined') Sidebar.render();
    },

    deleteNode: function(id) {
        if (!confirm('Delete this node?')) return;
        this.nodes = this.nodes.filter(function(n) { return n.id !== id; });
        this.connections = this.connections.filter(function(c) { return c.fromNodeId !== id && c.toNodeId !== id; });
        var el = document.getElementById(id);
        if (el) el.remove();
        if (this.selectedNodeId === id) { this.selectedNodeId = null; if (typeof Sidebar !== 'undefined') Sidebar.render(); }
        this.drawConnections();
        this.saveState();
    },

    renderNode: function(node) {
        var old = document.getElementById(node.id);
        if (old) old.remove();
        var self = this;
        var p = ProjectManager.getActive();
        var chars = p ? (p.config.characters || []) : [];
        var el = document.createElement('div');
        el.className = 'node ' + node.type;
        el.id = node.id;
        el.style.left = node.x + 'px';
        el.style.top = node.y + 'px';

        var choicesHTML = '';
        if (node.type === 'scene' && node.choices) {
            node.choices.forEach(function(ch, i) {
                var badges = '';
                var conn = self.connections.find(function(c) { return c.fromNodeId === node.id && c.fromChoiceIndex === i; });
                var nextNode = conn ? self.getNode(conn.toNodeId) : null;
                if (ch.sex) badges += '<span class="choice-badge badge-sex">🔞</span>';
                if (ch.corrupt) badges += '<span class="choice-badge badge-corrupt">corrupt</span>';
                chars.forEach(function(c) {
                    if (ch['strip_' + c.id]) badges += '<span class="choice-badge badge-strip">' + c.name + ':' + ch['strip_' + c.id] + '</span>';
                });
                var nextLabel = nextNode ? '→ ' + nextNode.title : '';
                choicesHTML += '<div class="choice-item" data-choice="' + i + '">' +
                    '<span class="choice-text">' + (ch.text || '...') + '</span>' + badges +
                    '<span class="choice-stats">' + nextLabel + '</span>' +
                    '<div class="socket" data-node="' + node.id + '" data-choice="' + i + '"></div></div>';
            });
            choicesHTML += '<button style="background:rgba(46,204,113,0.15);color:var(--green);border:1px solid var(--green);padding:3px;border-radius:4px;cursor:pointer;font-size:9px;width:100%;margin-top:2px;" onclick="event.stopPropagation();Canvas.addChoice(\'' + node.id + '\')">+ Add Choice</button>';
        }

        var connCount = this.connections.filter(function(c) { return c.fromNodeId === node.id || c.toNodeId === node.id; }).length;
        var preview = node.text ? (node.text.length > 70 ? node.text.substring(0, 70) + '...' : node.text) : '';

        el.innerHTML = '<div class="node-header"><span>' + (node.type === 'scene' ? '🎬' : '🏁') + ' ' + Utils.escHtml(node.title) +
            '</span><span style="font-size:8px;color:var(--dim);">' + connCount + '🔗</span>' +
            '<button class="btn-del" onclick="event.stopPropagation();Canvas.deleteNode(\'' + node.id + '\')">✕</button></div>' +
            '<div class="node-body">' + (node.type === 'ending' ? '<div style="font-size:18px;">' + (node.emoji || '⭐') + '</div>' : '') +
            '<div class="preview-text">' + Utils.escHtml(preview) + '</div>' + choicesHTML + '</div>';

        this.nodesLayer.appendChild(el);

        el.querySelector('.node-header').addEventListener('mousedown', function(e) {
            e.stopPropagation();
            self.selectNode(node.id);
            self.dragging = node;
            var pos = self.screenToCanvas(e.clientX, e.clientY);
            self.dragOffset.x = pos.x - node.x;
            self.dragOffset.y = pos.y - node.y;
        });

        el.addEventListener('mousedown', function(e) {
            if (!e.target.closest('.socket') && !e.target.closest('button') && !e.target.closest('.node-header')) {
                self.selectNode(node.id);
            }
        });

        el.querySelectorAll('.socket').forEach(function(socket) {
            socket.addEventListener('mousedown', function(e) {
                e.stopPropagation();
                e.preventDefault();
                self.connecting = {
                    nodeId: socket.dataset.node,
                    choiceIndex: parseInt(socket.dataset.choice),
                    sx: e.clientX,
                    sy: e.clientY
                };
                socket.classList.add('connecting');
            });
        });

        el.addEventListener('mouseup', function(e) {
            if (self.connecting && self.connecting.nodeId !== node.id && !e.target.closest('.socket')) {
                self.connections = self.connections.filter(function(c) {
                    return !(c.fromNodeId === self.connecting.nodeId && c.fromChoiceIndex === self.connecting.choiceIndex);
                });
                self.connections.push({
                    fromNodeId: self.connecting.nodeId,
                    fromChoiceIndex: self.connecting.choiceIndex,
                    toNodeId: node.id
                });
                self.connecting = null;
                document.querySelectorAll('.socket.connecting').forEach(function(s) { s.classList.remove('connecting'); });
                var fn = self.getNode(self.connections[self.connections.length - 1].fromNodeId);
                if (fn) self.renderNode(fn);
                self.renderNode(node);
                self.drawConnections();
                self.saveState();
                if (self.selectedNodeId && typeof Sidebar !== 'undefined') Sidebar.render();
            }
        });
    },

    addChoice: function(nodeId) {
        var node = this.getNode(nodeId);
        if (!node) return;
        if (!node.choices) node.choices = [];
        node.choices.push(this.makeDefaultChoice());
        this.renderNode(node);
        this.drawConnections();
        this.saveState();
        if (this.selectedNodeId === nodeId && typeof Sidebar !== 'undefined') Sidebar.render();
    },

    deleteChoice: function(nodeId, ci) {
        var node = this.getNode(nodeId);
        if (!node) return;
        node.choices.splice(ci, 1);
        this.connections = this.connections.filter(function(c) {
            return !(c.fromNodeId === nodeId && c.fromChoiceIndex === ci);
        });
        this.connections.forEach(function(c) {
            if (c.fromNodeId === nodeId && c.fromChoiceIndex > ci) c.fromChoiceIndex--;
        });
        this.renderNode(node);
        this.drawConnections();
        this.saveState();
    },

    // ---- DRAWING ----
    drawConnections: function() {
        if (!this.ctx) return;
        var w = this.lineCanvas.width / this.zoomLevel;
        var h = this.lineCanvas.height / this.zoomLevel;
        this.ctx.clearRect(0, 0, w, h);
        var self = this;
        this.connections.forEach(function(conn) {
            var fn = self.getNode(conn.fromNodeId);
            var tn = self.getNode(conn.toNodeId);
            if (!fn || !tn) return;
            var fe = document.getElementById(fn.id);
            var te = document.getElementById(tn.id);
            if (!fe || !te) return;
            var fs = fe.querySelector('.choice-item[data-choice="' + conn.fromChoiceIndex + '"] .socket');
            if (!fs) return;
            var fr = fs.getBoundingClientRect();
            var tr = te.getBoundingClientRect();
            var wr = self.canvasWrap.getBoundingClientRect();
            var x1 = (fr.left + fr.width / 2 - wr.left) / self.zoomLevel;
            var y1 = (fr.top + fr.height / 2 - wr.top) / self.zoomLevel;
            var x2 = (tr.left + tr.width / 2 - wr.left) / self.zoomLevel;
            var y2 = (tr.top + tr.height / 2 - wr.top) / self.zoomLevel;
            self.ctx.strokeStyle = '#ff6080';
            self.ctx.lineWidth = 2;
            self.ctx.lineCap = 'round';
            self.ctx.beginPath();
            self.ctx.moveTo(x1, y1);
            var cp = (x1 + x2) / 2;
            self.ctx.bezierCurveTo(cp, y1, cp, y2, x2, y2);
            self.ctx.stroke();
            var angle = Math.atan2(y2 - y1, x2 - x1);
            var as = 8;
            self.ctx.fillStyle = '#ff6080';
            self.ctx.beginPath();
            self.ctx.moveTo(x2, y2);
            self.ctx.lineTo(x2 - as * Math.cos(angle - 0.5), y2 - as * Math.sin(angle - 0.5));
            self.ctx.lineTo(x2 - as * Math.cos(angle + 0.5), y2 - as * Math.sin(angle + 0.5));
            self.ctx.closePath();
            self.ctx.fill();
        });
        if (this.connecting) {
            var fe = document.getElementById(this.connecting.nodeId);
            if (fe) {
                var fs = fe.querySelector('.choice-item[data-choice="' + this.connecting.choiceIndex + '"] .socket');
                if (fs) {
                    var fr = fs.getBoundingClientRect();
                    var wr = this.canvasWrap.getBoundingClientRect();
                    var x1 = (fr.left + fr.width / 2 - wr.left) / this.zoomLevel;
                    var y1 = (fr.top + fr.height / 2 - wr.top) / this.zoomLevel;
                    this.ctx.strokeStyle = '#ff90b0';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([6, 4]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo((this.mousePos.x - wr.left) / this.zoomLevel, (this.mousePos.y - wr.top) / this.zoomLevel);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }
        }
    },

    animLoop: function() {
        if (this.connecting) this.drawConnections();
        requestAnimationFrame(this.animLoop.bind(this));
    },

    saveState: function() {
        var p = ProjectManager.getActive();
        if (!p) return;
        var scenes = this.nodes.filter(function(n) { return n.type === 'scene'; }).map(function(n) {
            return {
                id: n.id, x: n.x, y: n.y, title: n.title, subtitle: n.subtitle,
                text: n.text, choices: n.choices, extraTags: n.extraTags
            };
        });
        var endings = {};
        this.nodes.filter(function(n) { return n.type === 'ending'; }).forEach(function(n) {
            endings[n.id] = { x: n.x, y: n.y, emoji: n.emoji, title: n.title, desc: n.text, color: n.color };
        });
        // Update project data in memory (don't write to disk yet)
        p.scenes = scenes;
        p.endings = endings;
        p.connections = this.connections;
        p.nodeIdCounter = this.nodeIdCounter;
        p.updatedAt = new Date().toISOString();
    },

    clearAll: function() {
        if (!confirm('Clear all nodes from canvas?')) return;
        this.nodes = [];
        this.connections = [];
        this.nodeIdCounter = 0;
        this.selectedNodeId = null;
        this.nodesLayer.innerHTML = '';
        this.ctx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
        if (typeof Sidebar !== 'undefined') Sidebar.render();
        this.saveState();
    }
};