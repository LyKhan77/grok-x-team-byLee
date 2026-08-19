import { exec } from 'child_process';
import { promisify } from 'util';
import { GpuInfo } from './types';

const execAsync = promisify(exec);

export async function sampleGpus(): Promise<GpuInfo[]> {
  const { stdout } = await execAsync(
    'nvidia-smi --query-gpu=index,name,memory.used,memory.total,temperature.gpu,utilization.gpu --format=csv,noheader,nounits'
  );

  return stdout
    .trim()
    .split('\n')
    .map((line) => {
      const [index, name, used, total, temp, util] = line.split(', ').map((s) => s.trim());
      return {
        index: parseInt(index, 10),
        name,
        used_mb: parseInt(used, 10),
        total_mb: parseInt(total, 10),
        temp_c: parseInt(temp, 10),
        util_pct: parseInt(util, 10),
      };
    });
}
