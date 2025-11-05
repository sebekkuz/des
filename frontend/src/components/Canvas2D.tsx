import React from "react";
import { useModelStore } from "../lib/store";

export default function Canvas2D() {
  const { components } = useModelStore();
  return (
    <svg width="100%" height="100%">
      {Object.entries(components).map(([id, c], i) => (
        <rect key={id} x={50 + i * 120} y={100} width={80} height={50} fill="#90caf9" stroke="#0d47a1" />
      ))}
    </svg>
  );
}
