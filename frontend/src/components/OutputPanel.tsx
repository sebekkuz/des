import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);

interface OutputPanelProps {
  logs: string[];
  metrics: { name: string; t: number; v: number }[];
}

// OutputPanel displays simulation logs and a simple line chart of metrics.
const OutputPanel: React.FC<OutputPanelProps> = ({ logs, metrics }) => {
  // Prepare chart data from metrics
  const labels = metrics.map((m) => m.t);
  const dataValues = metrics.map((m) => m.v);
  const chartData = {
    labels,
    datasets: [
      {
        label: metrics.length > 0 ? metrics[0].name : 'metric',
        data: dataValues,
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { title: { display: true, text: 'Time' } },
      y: { title: { display: true, text: 'Value' } },
    },
  } as const;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, paddingRight: '1rem', overflowY: 'auto' }}>
        <h4>Logs</h4>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{logs.join('\n')}</pre>
      </div>
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <h4>Metrics</h4>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default OutputPanel;