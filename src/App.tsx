import React, { useState, useEffect, useRef } from 'react';
import { generateAllRuns } from './utils/generateData';
import { Activity, AlertTriangle, CheckCircle2, Search, RefreshCw, XCircle, Terminal } from 'lucide-react';

export interface RunPoint {
  step: number;
  loss: number;
  lr: number;
  grad_norm: number;
}

export interface TrainingRun {
  id: string;
  name: string;
  status: 'completed' | 'running' | 'failed';
  totalSteps: number;
  data: RunPoint[];
  hasNan?: boolean;
  hasDuplicates?: boolean;
  hasGaps?: boolean;
  description: string;
}

export default function App() {
  const [runs, setRuns] = useState<TrainingRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'issues' | 'completed'>('all');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [activeRunData, setActiveRunData] = useState<RunPoint[]>([]);
  const [activeMetric, setActiveMetric] = useState<'loss' | 'lr' | 'grad_norm'>('loss');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const allRuns = generateAllRuns();
    setRuns(allRuns);
    if (allRuns.length > 0) {
      setSelectedRunId(allRuns[0].id);
    }
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    const currentRun = runs.find(r => r.id === selectedRunId);

    // Даем браузеру передохнуть через setTimeout, чтобы не фризить UI
    const timer = setTimeout(() => {
      if (currentRun) {
        let dataToRender = currentRun.data;
        
        // Оптимизация для огромных массивов (например, 1M точек): делаем downsampling
        if (dataToRender.length > 5000) {
          const factor = Math.ceil(dataToRender.length / 3000);
          const sampled = [];
          for (let i = 0; i < dataToRender.length; i += factor) {
            sampled.push(dataToRender[i]);
          }
          dataToRender = sampled;
        }

        setActiveRunData(dataToRender);
      }
      setLoading(false);
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [selectedRunId, runs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeRunData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.parentElement?.clientWidth || 800;
    const height = 350;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const values = activeRunData.map(d => d[activeMetric]);
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
    const minY = validValues.length ? Math.min(...validValues) : 0;
    const maxY = validValues.length ? Math.max(...validValues) : 1;
    const padding = (maxY - minY) * 0.1 || 0.1;
    
    const chartMinY = minY - padding;
    const chartMaxY = maxY + padding;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      
      const val = chartMaxY - (i / 4) * (chartMaxY - chartMinY);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText(val.toFixed(4), 5, y > 15 ? y - 4 : y + 12);
    }
    ctx.stroke();

    ctx.strokeStyle = activeMetric === 'loss' ? '#ef4444' : activeMetric === 'lr' ? '#3b82f6' : '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let isDrawing = false;

    activeRunData.forEach((point, index) => {
      const val = point[activeMetric];
      const x = (index / (activeRunData.length - 1 || 1)) * width;

      if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
        if (isDrawing) {
          ctx.stroke();
          ctx.beginPath();
          isDrawing = false;
        }
        ctx.strokeStyle = '#dc2626';
        ctx.strokeRect(x - 1, 0, 2, height);
        ctx.strokeStyle = activeMetric === 'loss' ? '#ef4444' : '#3b82f6';
        return;
      }

      const y = height - ((val - chartMinY) / (chartMaxY - chartMinY || 1)) * height;

      if (!isDrawing) {
        ctx.moveTo(x, y);
        isDrawing = true;
      } else {
        ctx.lineTo(x, y);
      }
    });

    if (isDrawing) {
      ctx.stroke();
    }
  }, [activeRunData, activeMetric]);

  const filteredRuns = runs.filter(run => {
    const matchesSearch = run.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'issues') return matchesSearch && (run.hasNan || run.hasDuplicates || run.hasGaps || run.status === 'failed');
    if (filterType === 'completed') return matchesSearch && run.status === 'completed';
    return matchesSearch;
  });

  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
            <Terminal size={20} /> Training Monitor
          </h1>
          <p className="text-xs text-gray-400 mt-1">Soup AI Frontend Engineering Task</p>
          
          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search runs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs rounded-md font-medium ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              All ({runs.length})
            </button>
            <button 
              onClick={() => setFilterType('issues')}
              className={`px-3 py-1 text-xs rounded-md font-medium ${filterType === 'issues' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Issues
            </button>
            <button 
              onClick={() => setFilterType('completed')}
              className={`px-3 py-1 text-xs rounded-md font-medium ${filterType === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              OK
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50">
          {filteredRuns.map(run => (
            <div
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              className={`p-3 cursor-pointer transition hover:bg-gray-800/50 ${selectedRunId === run.id ? 'bg-gray-800 border-l-4 border-indigo-500' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm text-gray-200 truncate max-w-[180px]">{run.name}</span>
                {run.hasNan || run.status === 'failed' ? (
                  <XCircle size={16} className="text-red-400 shrink-0" />
                ) : run.hasDuplicates || run.hasGaps ? (
                  <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>{run.totalSteps.toLocaleString()} steps</span>
                <span>{run.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRun ? (
          <>
            <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  {selectedRun.name}
                  <span className={`text-xs px-2 py-0.5 rounded uppercase ${selectedRun.status === 'failed' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-green-950 text-green-400 border border-green-800'}`}>
                    {selectedRun.status}
                  </span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">{selectedRun.description}</p>
              </div>

              <div className="flex gap-4">
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg text-right">
                  <div className="text-xs text-gray-400">Total Steps</div>
                  <div className="text-lg font-mono font-bold text-indigo-400">{selectedRun.totalSteps.toLocaleString('en-US')}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-3 rounded-lg text-right">
                  <div className="text-xs text-gray-400">Anomalies</div>
                  <div className="text-lg font-mono font-bold text-amber-400">
                    {selectedRun.hasNan ? 'NaN / Inf' : selectedRun.hasDuplicates ? 'Dupes' : selectedRun.hasGaps ? 'Gaps' : 'None'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
                  <RefreshCw className="animate-spin" size={24} /> Loading run metrics...
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveMetric('loss')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeMetric === 'loss' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        Loss
                      </button>
                      <button
                        onClick={() => setActiveMetric('lr')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeMetric === 'lr' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        Learning Rate (lr)
                      </button>
                      <button
                        onClick={() => setActiveMetric('grad_norm')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeMetric === 'grad_norm' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        Gradient Norm
                      </button>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">Rendered via HTML5 Canvas (Optimized)</span>
                  </div>

                  <div className="relative w-full h-[350px] bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                    <canvas ref={canvasRef} className="w-full h-full" />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">Select a training run from the sidebar</div>
        )}
      </div>
    </div>
  );
}