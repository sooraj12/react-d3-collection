import React from "react";
import { select } from "d3-selection";

const DEFAULT_NODE_CIRCLE_RADIUS = 8;

const textLayout = {
  title: {
    end: {
      textAnchor: "end",
      x: -12,
      dy: ".35em",
    },
    start: {
      textAnchor: "start",
      x: 12,
      dy: ".35em",
    },
  },

  label: {
    textAnchor: "middle",
    y: 10,
  },
};

class TreeNode extends React.Component {
  nodeRef = null;

  state = {
    transform: this.setTransform(
      this.props.position,
      this.props.parent,
      this.props.orientation,
      true
    ),
    initialStyle: {
      opacity: 0,
    },
  };

  componentDidMount() {
    this.commitTransform();
  }

  componentDidUpdate() {
    this.commitTransform();
  }

  shouldComponentUpdate(nextProps) {
    return this.shouldNodeTransform(this.props, nextProps);
  }

  shouldNodeTransform = (ownProps, nextProps) =>
    nextProps.subscriptions !== ownProps.subscriptions ||
    nextProps.position.x !== ownProps.position.x ||
    nextProps.position.y !== ownProps.position.y ||
    nextProps.orientation !== ownProps.orientation;

  setTransform(position, parent, orientation, shouldTranslateToOrigin = false) {
    if (shouldTranslateToOrigin) {
      const hasParent = parent !== null && parent !== undefined;
      const originX = hasParent ? parent.x : 0;
      const originY = hasParent ? parent.y : 0;
      return orientation === "horizontal"
        ? `translate(${originY},${originX})`
        : `translate(${originX},${originY})`;
    }
    return orientation === "horizontal"
      ? `translate(${position.y},${position.x})`
      : `translate(${position.x},${position.y})`;
  }

  applyTransform(transform, transitionDuration, opacity = 1, done = () => {}) {
    if (this.props.enableLegacyTransitions) {
      select(this.nodeRef)
        .transition()
        .duration(transitionDuration)
        .attr("transform", transform)
        .style("opacity", opacity)
        .on("end", done);
    } else {
      select(this.nodeRef)
        .attr("transform", transform)
        .style("opacity", opacity);
      done();
    }
  }

  commitTransform() {
    const { orientation, transitionDuration, position, parent } = this.props;
    const transform = this.setTransform(position, parent, orientation);
    this.applyTransform(transform, transitionDuration);
  }

  renderNodeElement = () => {
    const { data, renderCustomNodeElement } = this.props;
    if (typeof renderCustomNodeElement === "function") {
      return renderCustomNodeElement({
        nodeDatum: data,
        toggleNode: this.handleNodeToggle,
      });
    }

    const type = data.type;
    const nodeClass = `${data.pool}_node`;
    const textProps = data.children
      ? textLayout.title.end
      : textLayout.title.start;

    return (
      <>
        {type !== "label" && (
          <circle
            r={DEFAULT_NODE_CIRCLE_RADIUS}
            onClick={(evt) => {
              this.handleNodeToggle();
              this.handleOnClick(evt);
            }}
            onMouseOver={this.handleOnMouseOver}
            onMouseOut={this.handleOnMouseOut}
            className={`node_circle ${nodeClass}`}
          ></circle>
        )}
        <g className="rd3t-label">
          {type === "label" ? (
            <text className={`label-text ${nodeClass}`} {...textLayout.label}>
              {data.name}
            </text>
          ) : (
            <text
              className={`rd3t-label__title ${
                data.highlight ? "node-hilight" : ""
              }`}
              {...textProps}
            >
              {data.name}
            </text>
          )}
        </g>
      </>
    );
  };

  handleNodeToggle = () => this.props.onNodeToggle(this.props.data.__rd3t.id);

  handleOnClick = (evt) => {
    this.props.onNodeClick(this.props.data.__rd3t.id, evt);
  };

  handleOnMouseOver = (evt) => {
    this.props.onNodeMouseOver(this.props.data.__rd3t.id, evt);
  };

  handleOnMouseOut = (evt) => {
    this.props.onNodeMouseOut(this.props.data.__rd3t.id, evt);
  };

  componentWillLeave(done) {
    const { orientation, transitionDuration, position, parent } = this.props;
    const transform = this.setTransform(position, parent, orientation, true);
    this.applyTransform(transform, transitionDuration, 0, done);
  }

  render() {
    const { data } = this.props;

    return (
      <g
        id={data.__rd3t.id}
        ref={(n) => {
          this.nodeRef = n;
        }}
        style={this.state.initialStyle}
        className={"rd3t-node"}
        transform={this.state.transform}
      >
        {this.renderNodeElement()}
      </g>
    );
  }
}

export { TreeNode };
