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

function createRandom(seed: number) {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

export function generateAllRuns(): TrainingRun[] {
  const runs: TrainingRun[] = [];

  for (let i = 1; i <= 10; i++) {
    const rng = createRandom(i * 123);
    const totalSteps = 1000;
    const data: RunPoint[] = [];
    let currentLoss = 2.5 + rng() * 0.5;

    for (let step = 1; step <= totalSteps; step++) {
      currentLoss = Math.max(0.05, currentLoss * 0.995 + (rng() - 0.48) * 0.05);
      const lr = 0.001 * Math.max(0.1, 1 - step / totalSteps);
      const grad_norm = 1.0 + rng() * 2.0;
      data.push({ step, loss: currentLoss, lr, grad_norm });
    }

    runs.push({
      id: `run-${i}`,
      name: `Standard Model v${i}`,
      status: i <= 2 ? 'running' : 'completed',
      totalSteps,
      data,
      description: 'Stable training run with standard cosine learning rate decay.'
    });
  }

  {
    const data: RunPoint[] = [];
    let loss = 1.2;
    for (let step = 1; step <= 500; step++) {
      if (step === 420) loss = NaN;
      else if (step === 421) loss = Infinity;
      else if (step > 421) loss = 50.0 + Math.random() * 10;
      else loss *= 0.99;

      data.push({ step, loss, lr: 0.0001, grad_norm: isNaN(loss) ? 99999 : 5.0 });
    }
    runs.push({
      id: `run-nan-exploding`,
      name: `🚨 Exploding Gradient (NaN/Inf)`,
      status: 'failed',
      totalSteps: 500,
      data,
      hasNan: true,
      description: 'Contains NaN and Infinity values mid-training due to gradient explosion.'
    });
  }

  {
    const rawData = [];
    for (let step = 1; step <= 300; step++) {
      rawData.push({ step, loss: 2.0 / (step * 0.1 + 1), lr: 0.001, grad_norm: 1.5 });
    }
    rawData.push({ step: 150, loss: 4.5, lr: 0.001, grad_norm: 10.0 }); // дубликат шага 150 с плохим loss
    rawData.push({ step: 150, loss: 4.2, lr: 0.001, grad_norm: 8.0 });  // еще один дубликат
    
    const temp = rawData[50];
    rawData[50] = rawData[55];
    rawData[55] = temp;

    runs.push({
      id: `run-unsorted-dupes`,
      name: `⚠️ Out-of-Order & Duplicates`,
      status: 'completed',
      totalSteps: 300,
      data: rawData,
      hasDuplicates: true,
      description: 'Log files had race conditions causing out-of-order steps and duplicate entries.'
    });
  }

  
  {
    const data: RunPoint[] = [];
    for (let step = 1; step <= 100; step++) {
      data.push({ step, loss: 2.0 - step * 0.01, lr: 0.001, grad_norm: 1.2 });
    }
    
    for (let step = 5000; step <= 5200; step++) {
      data.push({ step, loss: 0.5 - (step - 5000) * 0.0001, lr: 0.0005, grad_norm: 0.8 });
    }
    runs.push({
      id: `run-gaps`,
      name: `📉 Training Gap (Server Crash)`,
      status: 'completed',
      totalSteps: 5200,
      data,
      hasGaps: true,
      description: 'Large gap in step sequence caused by node preemption and checkpoint recovery.'
    });
  }

  
  {
    const totalSteps = 1000000;
    const data: RunPoint[] = new Array(totalSteps);
    const spikeStep = 543210; 
    for (let i = 0; i < totalSteps; i++) {
      const step = i + 1;
      let loss = 0.5 + 1.5 * Math.exp(-step / 200000);
      
      if (step === spikeStep) {
        loss = 25.46; 
      }

      data[i] = {
        step,
        loss,
        lr: 0.00001,
        grad_norm: step === spikeStep ? 45.0 : 1.1
      };
    }

    runs.push({
      id: `run-one-million`,
      name: `🔥 1M Points (Hidden Spike)`,
      status: 'completed',
      totalSteps,
      data,
      description: '1 Million steps workload. Contains a single isolated spike at step 543,210.'
    });
  }

  for (let i = 15; i <= 20; i++) {
    const totalSteps = 500;
    const data: RunPoint[] = [];
    for (let step = 1; step <= totalSteps; step++) {
      data.push({
        step,
        loss: 1.0 + Math.sin(step / 20) * 0.2 + (Math.random() * 0.1),
        lr: 0.0002,
        grad_norm: 2.0
      });
    }
    runs.push({
      id: `run-${i}`,
      name: `Oscillating Run #${i}`,
      status: 'completed',
      totalSteps,
      data,
      description: 'High frequency oscillation test run.'
    });
  }

  return runs;
}