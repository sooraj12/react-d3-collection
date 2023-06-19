import { BubbleGraph } from "./BubbleGraph";
import { chartData } from "./BubbleGraph/chartData";

import { TreeGraph } from "./TreeGraph";
import { treeData } from "./TreeGraph/treeData";

function App() {
  return (
    <div className="App">
      <h3>Bubble Graph</h3>
      <BubbleGraph data={chartData} useLabels={true} />
      <h3>Tree Graph</h3>
      <div
        style={{
          height: "480px",
        }}
      >
        <TreeGraph data={treeData} />
      </div>
    </div>
  );
}

export { App };
