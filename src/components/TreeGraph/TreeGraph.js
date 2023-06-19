import React from "react";
import { v4 as uuidv4 } from "uuid";
import { cloneDeep as clone } from "lodash";
import { tree as d3tree, hierarchy } from "d3-hierarchy";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { dequal as deepEqual } from "dequal/lite";

import { TransitionGroupWrapper } from "./TransitionGroupWrapper";
import { TreeNode } from "./TreeNode";
import { TreeNodeLink } from "./TreeNodeLink";

import "./TreeGraph.scss";

class TreeGraph extends React.Component {
  static defaultProps = {
    onNodeClick: undefined,
    onNodeMouseOver: undefined,
    onNodeMouseOut: undefined,
    onLinkClick: undefined,
    onLinkMouseOver: undefined,
    onLinkMouseOut: undefined,
    onUpdate: undefined,
    orientation: "horizontal",
    translate: { x: 200, y: 150 },
    pathFunc: "diagonal",
    pathClassFunc: undefined,
    transitionDuration: 750,
    depthFactor: undefined,
    collapsible: true,
    initialDepth: 1,
    zoomable: true,
    zoom: 0.7,
    scaleExtent: { min: 0.1, max: 1 },
    nodeSize: { x: 550, y: 45 },
    separation: { siblings: 1, nonSiblings: 2 },
    shouldCollapseNeighborNodes: false,
    svgClassName: "",
    rootNodeClassName: "",
    branchNodeClassName: "",
    leafNodeClassName: "",
    renderCustomNodeElement: undefined,
    enableLegacyTransitions: true,
  };

  state = {
    dataRef: this.props.data,
    data: TreeGraph.assignInternalProperties(clone(this.props.data)),
    d3: TreeGraph.calculateD3Geometry(this.props),
    isTransitioning: false,
    isInitialRenderForDataset: true,
  };

  internalState = {
    targetNode: null,
    isTransitioning: false,
  };

  svgInstanceRef = `rd3t-svg-${uuidv4()}`;
  gInstanceRef = `rd3t-g-${uuidv4()}`;

  static getDerivedStateFromProps(nextProps, prevState) {
    let derivedState = null;
    if (nextProps.data !== prevState.dataRef) {
      derivedState = {
        dataRef: nextProps.data,
        data: TreeGraph.assignInternalProperties(clone(nextProps.data)),
        isInitialRenderForDataset: true,
      };
    }
    const d3 = TreeGraph.calculateD3Geometry(nextProps);
    if (!deepEqual(d3, prevState.d3)) {
      derivedState = derivedState || {};
      derivedState.d3 = d3;
    }
    return derivedState;
  }

  componentDidMount() {
    this.bindZoomListener(this.props);
    this.setState({ isInitialRenderForDataset: false });
  }

  componentDidUpdate(prevProps) {
    if (this.props.data !== prevProps.data) {
      this.setState({ isInitialRenderForDataset: false });
    }

    if (
      !deepEqual(this.props.translate, prevProps.translate) ||
      !deepEqual(this.props.scaleExtent, prevProps.scaleExtent) ||
      this.props.zoom !== prevProps.zoom ||
      this.props.enableLegacyTransitions !== prevProps.enableLegacyTransitions
    ) {
      this.bindZoomListener(this.props);
    }

    this.internalState.targetNode = null;
  }

  setInitialTreeDepth(nodeSet, initialDepth) {
    nodeSet.forEach((n) => {
      n.data.__rd3t.collapsed = n.depth >= initialDepth;
    });
  }

  bindZoomListener(props) {
    const { zoomable, scaleExtent, translate, zoom } = props;
    const svg = select(`.${this.svgInstanceRef}`);
    const g = select(`.${this.gInstanceRef}`);
    if (zoomable) {
      svg.call(
        d3zoom().transform,
        zoomIdentity.translate(translate.x, translate.y).scale(zoom)
      );
      svg.call(
        d3zoom()
          .scaleExtent([scaleExtent.min, scaleExtent.max])
          .on("zoom", (event) => {
            g.attr("transform", event.transform);
          })
      );
    }
  }
  static assignInternalProperties(data, currentDepth = 0) {
    const d = Array.isArray(data) ? data : [data];
    return d.map((n) => {
      const nodeDatum = n;
      nodeDatum.__rd3t = { id: null, depth: null, collapsed: false };
      nodeDatum.__rd3t.id = uuidv4();
      nodeDatum.__rd3t.depth = currentDepth;
      if (nodeDatum.children && nodeDatum.children.length > 0) {
        nodeDatum.children = TreeGraph.assignInternalProperties(
          nodeDatum.children,
          currentDepth + 1
        );
      }
      return nodeDatum;
    });
  }

  findNodesById(nodeId, nodeSet, hits) {
    if (hits.length > 0) {
      return hits;
    }
    hits = hits.concat(nodeSet.filter((node) => node.__rd3t.id === nodeId));
    nodeSet.forEach((node) => {
      if (node.children && node.children.length > 0) {
        hits = this.findNodesById(nodeId, node.children, hits);
      }
    });
    return hits;
  }

  findNodesAtDepth(depth, nodeSet, accumulator) {
    accumulator = accumulator.concat(
      nodeSet.filter((node) => node.__rd3t.depth === depth)
    );
    nodeSet.forEach((node) => {
      if (node.children && node.children.length > 0) {
        accumulator = this.findNodesAtDepth(depth, node.children, accumulator);
      }
    });
    return accumulator;
  }

  static collapseNode(nodeDatum) {
    if (nodeDatum) {
      nodeDatum.__rd3t.collapsed = true;
      if (nodeDatum.children && nodeDatum.children.length > 0) {
        nodeDatum.children.forEach((child) => {
          TreeGraph.collapseNode(child);
        });
      }
    }
  }

  static expandNode(nodeDatum) {
    nodeDatum.__rd3t.collapsed = false;
  }

  collapseNeighborNodes(targetNode, nodeSet) {
    const neighbors = this.findNodesAtDepth(
      targetNode.__rd3t.depth,
      nodeSet,
      []
    ).filter((node) => node.__rd3t.id !== targetNode.__rd3t.id);
    neighbors.forEach((neighbor) => TreeGraph.collapseNode(neighbor));
  }

  handleNodeToggle = (nodeId) => {
    const data = clone(this.state.data);
    const matches = this.findNodesById(nodeId, data, []);
    const targetNodeDatum = matches[0];

    if (this.props.collapsible && !this.state.isTransitioning) {
      if (targetNodeDatum.__rd3t.collapsed) {
        TreeGraph.expandNode(targetNodeDatum);
        this.props.shouldCollapseNeighborNodes &&
          this.collapseNeighborNodes(targetNodeDatum, data);
      } else {
        TreeGraph.collapseNode(targetNodeDatum);
      }

      if (this.props.enableLegacyTransitions) {
        this.setState({ data, isTransitioning: true }, () => {
          this.handleLabelDispaly(nodeId);
        });
        setTimeout(
          () => this.setState({ isTransitioning: false }),
          this.props.transitionDuration + 10
        );
      } else {
        this.setState({ data });
      }

      this.internalState.targetNode = targetNodeDatum;
    }
  };

  handleLabelDispaly = (nodeId) => {
    const data = clone(this.state.data);
    const matches = this.findNodesById(nodeId, data, []);
    const targetNodeDatum = matches[0];
    // find nodes at the next level
    const nodesAtDepth = this.findNodesAtDepth(
      targetNodeDatum.__rd3t.depth,
      data,
      []
    );

    const labelNode = nodesAtDepth.find((node) => node.type === "label");

    const isOpen = nodesAtDepth
      .filter((node) => node.type !== "label")
      .some((node) => !node.__rd3t.collapsed);

    if (isOpen) {
      if (labelNode && labelNode.__rd3t.collapsed) {
        TreeGraph.expandNode(labelNode);
        this.setState({ data });
      }
    } else {
      TreeGraph.collapseNode(labelNode);
      this.setState({ data });
    }
  };

  handleOnNodeClickCb = (nodeId, evt) => {
    const { onNodeClick } = this.props;
    if (onNodeClick && typeof onNodeClick === "function") {
      const data = clone(this.state.data);
      const matches = this.findNodesById(nodeId, data, []);
      const targetNode = matches[0];
      evt.persist();
      onNodeClick(clone(targetNode), evt);
    }
  };
  handleOnLinkClickCb = (linkSource, linkTarget, evt) => {
    const { onLinkClick } = this.props;
    if (onLinkClick && typeof onLinkClick === "function") {
      evt.persist();
      onLinkClick(clone(linkSource), clone(linkTarget), evt);
    }
  };

  handleOnNodeMouseOverCb = (nodeId, evt) => {
    const { onNodeMouseOver } = this.props;
    if (onNodeMouseOver && typeof onNodeMouseOver === "function") {
      const data = clone(this.state.data);
      const matches = this.findNodesById(nodeId, data, []);
      const targetNode = matches[0];
      evt.persist();
      onNodeMouseOver(clone(targetNode), evt);
    }
  };

  handleOnLinkMouseOverCb = (linkSource, linkTarget, evt) => {
    const { onLinkMouseOver } = this.props;
    if (onLinkMouseOver && typeof onLinkMouseOver === "function") {
      evt.persist();
      onLinkMouseOver(clone(linkSource), clone(linkTarget), evt);
    }
  };

  handleOnNodeMouseOutCb = (nodeId, evt) => {
    const { onNodeMouseOut } = this.props;
    if (onNodeMouseOut && typeof onNodeMouseOut === "function") {
      const data = clone(this.state.data);
      const matches = this.findNodesById(nodeId, data, []);
      const targetNode = matches[0];
      evt.persist();
      onNodeMouseOut(clone(targetNode), evt);
    }
  };

  handleOnLinkMouseOutCb = (linkSource, linkTarget, evt) => {
    const { onLinkMouseOut } = this.props;
    if (onLinkMouseOut && typeof onLinkMouseOut === "function") {
      evt.persist();
      onLinkMouseOut(clone(linkSource), clone(linkTarget), evt);
    }
  };

  generateTree() {
    const { initialDepth, depthFactor, separation, nodeSize, orientation } =
      this.props;
    const { isInitialRenderForDataset } = this.state;
    const tree = d3tree()
      .nodeSize(
        orientation === "horizontal"
          ? [nodeSize.y, nodeSize.x]
          : [nodeSize.x, nodeSize.y]
      )
      .separation((a, b) =>
        a.parent.data.__rd3t.id === b.parent.data.__rd3t.id
          ? separation.siblings
          : separation.nonSiblings
      );

    const rootNode = tree(
      hierarchy(this.state.data[0], (d) =>
        d.__rd3t.collapsed ? null : d.children
      )
    );
    let nodes = rootNode.descendants();
    const links = rootNode.links();
    if (initialDepth !== undefined && isInitialRenderForDataset) {
      this.setInitialTreeDepth(nodes, initialDepth);
    }

    if (depthFactor) {
      nodes.forEach((node) => {
        node.y = node.depth * depthFactor;
      });
    }

    return { nodes, links };
  }

  static calculateD3Geometry(nextProps) {
    let scale;
    if (nextProps.zoom > nextProps.scaleExtent.max) {
      scale = nextProps.scaleExtent.max;
    } else if (nextProps.zoom < nextProps.scaleExtent.min) {
      scale = nextProps.scaleExtent.min;
    } else {
      scale = nextProps.zoom;
    }
    return {
      translate: nextProps.translate,
      scale,
    };
  }

  getNodeClassName = (parent, nodeDatum) => {
    const { rootNodeClassName, branchNodeClassName, leafNodeClassName } =
      this.props;
    const hasParent = parent !== null && parent !== undefined;
    if (hasParent) {
      return nodeDatum.children ? branchNodeClassName : leafNodeClassName;
    } else {
      return rootNodeClassName;
    }
  };

  render() {
    const { nodes, links } = this.generateTree();
    const {
      renderCustomNodeElement,
      orientation,
      pathFunc,
      transitionDuration,
      nodeSize,
      depthFactor,
      initialDepth,
      separation,
      enableLegacyTransitions,
      pathClassFunc,
    } = this.props;
    const { translate, scale } = this.state.d3;
    const subscriptions = {
      ...nodeSize,
      ...separation,
      depthFactor,
      initialDepth,
    };

    return (
      <div className={`rd3t-tree-container rd3t-grabbable`}>
        <svg
          className={`rd3t-svg ${this.svgInstanceRef}`}
          width="100%"
          height="100%"
        >
          <TransitionGroupWrapper
            enableLegacyTransitions={enableLegacyTransitions}
            component="g"
            className={`rd3t-g ${this.gInstanceRef}`}
            transform={`translate(${translate.x},${translate.y}) scale(${scale})`}
          >
            {links.map((linkData, i) => {
              return (
                <TreeNodeLink
                  key={"link-" + i}
                  orientation={orientation}
                  pathFunc={pathFunc}
                  pathClassFunc={pathClassFunc}
                  linkData={linkData}
                  onClick={this.handleOnLinkClickCb}
                  onMouseOver={this.handleOnLinkMouseOverCb}
                  onMouseOut={this.handleOnLinkMouseOutCb}
                  enableLegacyTransitions={enableLegacyTransitions}
                  transitionDuration={transitionDuration}
                />
              );
            })}

            {nodes
              .filter(({ data }) => data.type !== "label")
              .map(({ data, x, y, parent, ...rest }, i) => {
                return (
                  <TreeNode
                    key={"node-" + i}
                    data={data}
                    position={{ x, y }}
                    parent={parent}
                    nodeClassName={this.getNodeClassName(parent, data)}
                    renderCustomNodeElement={renderCustomNodeElement}
                    nodeSize={nodeSize}
                    orientation={orientation}
                    enableLegacyTransitions={enableLegacyTransitions}
                    transitionDuration={transitionDuration}
                    onNodeToggle={this.handleNodeToggle}
                    onNodeClick={this.handleOnNodeClickCb}
                    onNodeMouseOver={this.handleOnNodeMouseOverCb}
                    onNodeMouseOut={this.handleOnNodeMouseOutCb}
                    subscriptions={subscriptions}
                  />
                );
              })}

            {/* generate all the labels */}
            {nodes
              .filter(({ data }) => data.type === "label")
              .map(({ data, x, y, parent, ...rest }, i) => {
                return (
                  <TreeNode
                    key={"node-" + i}
                    data={data}
                    position={{ x, y }}
                    parent={parent}
                    nodeClassName={this.getNodeClassName(parent, data)}
                    renderCustomNodeElement={renderCustomNodeElement}
                    nodeSize={nodeSize}
                    orientation={orientation}
                    enableLegacyTransitions={enableLegacyTransitions}
                    transitionDuration={transitionDuration}
                    onNodeToggle={this.handleNodeToggle}
                    onNodeClick={this.handleOnNodeClickCb}
                    onNodeMouseOver={this.handleOnNodeMouseOverCb}
                    onNodeMouseOut={this.handleOnNodeMouseOutCb}
                    subscriptions={subscriptions}
                  />
                );
              })}
          </TransitionGroupWrapper>
        </svg>
      </div>
    );
  }
}

export { TreeGraph };
