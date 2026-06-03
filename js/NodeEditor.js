var NodeEditor = {
    addNode: function(type) { Canvas.addNode(type); },
    addChoice: function(nodeId) { Canvas.addChoice(nodeId); },
    deleteChoice: function(nodeId, ci) { Canvas.deleteChoice(nodeId, ci); },
    updateNodeProp: function(prop, value) {
        var node = Canvas.getNode(Canvas.selectedNodeId);
        if (!node) return;
        node[prop] = value;
        Canvas.renderNode(node);
        Canvas.drawConnections();
        Canvas.saveState();
    },
    updateChoice: function(nodeId, ci, prop, value) {
        var node = Canvas.getNode(nodeId);
        if (!node || !node.choices || !node.choices[ci]) return;
        node.choices[ci][prop] = value;
        Canvas.renderNode(node);
        Canvas.drawConnections();
        Canvas.saveState();
    }
};