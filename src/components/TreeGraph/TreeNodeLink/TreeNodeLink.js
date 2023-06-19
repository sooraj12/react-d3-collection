import React from "react";
import { linkHorizontal, linkVertical } from "d3-shape";
import { select } from "d3-selection";

class TreeNodeLink extends React.PureComponent {
  linkRef = null;

  state = {
    initialStyle: {
      opacity: 0,
    },
  };

  componentDidMount() {
    this.applyOpacity(1, this.props.transitionDuration);
  }

  componentWillLeave(done) {
    this.applyOpacity(0, this.props.transitionDuration, done);
  }

  applyOpacity(opacity, transitionDuration, done = () => {}) {
    if (this.props.enableLegacyTransitions) {
      select(this.linkRef)
        // @ts-ignore
        .transition()
        .duration(transitionDuration)
        .style("opacity", opacity)
        .on("end", done);
    } else {
      select(this.linkRef).style("opacity", opacity);
      done();
    }
  }

  drawStepPath(linkData, orientation) {
    const { source, target } = linkData;
    const deltaY = target.y - source.y;
    return orientation === "horizontal"
      ? `M${source.y},${source.x} H${source.y + deltaY / 2} V${target.x} H${
          target.y
        }`
      : `M${source.x},${source.y} V${source.y + deltaY / 2} H${target.x} V${
          target.y
        }`;
  }

  drawDiagonalPath(linkData, orientation) {
    const { source, target } = linkData;
    return orientation === "horizontal"
      ? linkHorizontal()({
          source: [source.y, source.x],
          target: [target.y, target.x],
        })
      : linkVertical()({
          source: [source.x, source.y],
          target: [target.x, target.y],
        });
  }

  drawStraightPath(linkData, orientation) {
    const { source, target } = linkData;
    return orientation === "horizontal"
      ? `M${source.y},${source.x}L${target.y},${target.x}`
      : `M${source.x},${source.y}L${target.x},${target.y}`;
  }

  drawElbowPath(linkData, orientation) {
    return orientation === "horizontal"
      ? `M${linkData.source.y},${linkData.source.x}V${linkData.target.x}H${linkData.target.y}`
      : `M${linkData.source.x},${linkData.source.y}V${linkData.target.y}H${linkData.target.x}`;
  }

  drawPath() {
    const { linkData, orientation, pathFunc } = this.props;

    if (typeof pathFunc === "function") {
      return pathFunc(linkData, orientation);
    }
    if (pathFunc === "elbow") {
      return this.drawElbowPath(linkData, orientation);
    }
    if (pathFunc === "straight") {
      return this.drawStraightPath(linkData, orientation);
    }
    if (pathFunc === "step") {
      return this.drawStepPath(linkData, orientation);
    }
    return this.drawDiagonalPath(linkData, orientation);
  }

  getClassName() {
    const { linkData } = this.props;
    const targetPool = linkData.target.data.pool;
    const type = linkData.target.data.type;
    if (type === "label") {
      return "label_link";
    } else {
      return `${targetPool}_link`;
    }
  }

  handleOnClick = (evt) => {
    this.props.onClick(
      this.props.linkData.source,
      this.props.linkData.target,
      evt
    );
  };

  handleOnMouseOver = (evt) => {
    this.props.onMouseOver(
      this.props.linkData.source,
      this.props.linkData.target,
      evt
    );
  };

  handleOnMouseOut = (evt) => {
    this.props.onMouseOut(
      this.props.linkData.source,
      this.props.linkData.target,
      evt
    );
  };

  render() {
    const className = this.getClassName();
    return (
      <path
        ref={(l) => {
          this.linkRef = l;
        }}
        style={{ ...this.state.initialStyle }}
        className={`rd3t-link ${className}`}
        d={this.drawPath()}
        onClick={this.handleOnClick}
        onMouseOver={this.handleOnMouseOver}
        onMouseOut={this.handleOnMouseOut}
      />
    );
  }
}

export { TreeNodeLink };
