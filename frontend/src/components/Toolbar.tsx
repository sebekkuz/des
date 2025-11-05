import React from "react";
import { apiStart, apiPause, apiReset, apiLoadModel } from "../lib/modelIO";

export default function Toolbar() {
  return (
    <div className="toolbar">
      <button onClick={apiLoadModel}>Load model</button>
      <button onClick={apiStart}>Start</button>
      <button onClick={apiPause}>Pause</button>
      <button onClick={apiReset}>Reset</button>
    </div>
  );
}
