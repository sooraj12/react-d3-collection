import React from "react";
import { TransitionGroup } from "react-transition-group";

const TransitionGroupWrapper = (props) =>
  props.enableLegacyTransitions ? (
    <TransitionGroup
      component={props.component}
      className={props.className}
      transform={props.transform}
    >
      {props.children}
    </TransitionGroup>
  ) : (
    <g className={props.className} transform={props.transform}>
      {props.children}
    </g>
  );

export { TransitionGroupWrapper };
