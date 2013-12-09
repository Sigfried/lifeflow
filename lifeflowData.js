'use strict';
var lifeflowData = function () {
    var 
        eventNameProp = null,
        alignmentLineWidth = 28,
        eventNodeWidth = 50,
        endNodeWidth = 0
            ;
    var makeNodes = function(startRecs, nextFunc, backwards, maxDepth) {
        var groupKeyName = (backwards ? 'prev' : 'next') + '_' + eventNameProp;
        function preGroupRecsHook(records) { // group next records, not the ones we start with
            return _.chain(records)
                            //.tap(function(d) { console.log(d) })
                            .filter(nextFunc)
                            .map(nextFunc)
                            .value();
        }
        function addChildren(list, notRoot) {
            if (maxDepth && list.length && list[0].depth && list[0].depth >= maxDepth)
                return;
            if (!notRoot) {
                list = enlightenedData.group(startRecs, eventNameProp);
                list.sort(function(a,b) {
                            return b.records.length - a.records.length
                        })
            }
            _.each(list, function(d) { 
                //d.depth = d.parent ? d.parent.depth + 1 : 0;
                d.extendGroupBy(eventNameProp, {
                    preGroupRecsHook:preGroupRecsHook,
                    childProp:'children'})
                addChildren(d.children, true);
                d.children.sort(function(a,b) {
                            return b.records.length - a.records.length
                        })
                })
            return list;
        }
        var lfnodes = addChildren(startRecs);
        lfnodes = position({children:lfnodes,records:[]}).children;
        return lfnodes.flattenTree();


        function rectWidth(recs) {
            return d3.mean(recs.map(function(d) { 
                return d.timeTo(nextFunc(d))
            }));
        }
        function position(lfnode, yOffset) {
            var children = lfnode.children;
            if (lfnode.parent) {
                lfnode.x = lfnode.parent.x + lfnode.parent.dx 
                    //+ eventNodeWidth * (!negative || -1);;
                lfnode.y = lfnode.parent.y;
            } else {
                lfnode.x = alignmentLineWidth * (!backwards || -1);
                lfnode.y = 0;
            }
            lfnode.y += (yOffset || 0);
            lfnode.dx = rectWidth(lfnode.records) + eventNodeWidth;
            lfnode.dy = lfnode.records.length;
            if (children && (n = children.length)) {
                var i = -1, c, yOffset = 0, n;
                while (++i < n) {
                    position(c = children[i], yOffset)
                    yOffset += c.dy;
                }
            }
            lfnode.backwards = !!backwards;
            return lfnode;
        }
        var nodes = enlightenedData.group(startRecs, eventNameProp, {
                        preGroupRecsHook: preGroupRecsHook,
                        postGroupGroupsHook: postGroupGroupsHook,
                        dimName: groupKeyName,
                        //postGroupValHook: postGroupValHook,
                        recurse: childrenFunc,
                        childProp: 'children'
                    });
        nodes = position({children:nodes,records:[]}).children;
        return nodes.flattenTree();
    }
    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    makeNodes.eventNameProp = function (_) {
        if (!arguments.length) return eventNameProp;
        eventNameProp = _;
        return makeNodes;
    };
    makeNodes.alignmentLineWidth = function(_) {
        if (!arguments.length) return alignmentLineWidth;
        alignmentLineWidth = _;
        return lifeflow;
    };
    makeNodes.eventNodeWidth = function(_) {
        if (!arguments.length) return eventNodeWidth;
        eventNodeWidth = _;
        return lifeflow;
    };
    makeNodes.endNodeWidth = function(_) {
        if (!arguments.length) return endNodeWidth;
        endNodeWidth = _;
        return lifeflow;
    };
    //============================================================
    function endNode(parent) {  // not using yet
        var enode = {
            parent:parent,
            next: function() { 
                return this },
            prev: function() { return this }
        };
        enode[eventNameProp] = 'END_NODE';
        return enode;
    }
    return makeNodes;
}
