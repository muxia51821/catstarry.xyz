import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);
const python = process.env.PYTHON ?? (process.platform === 'win32' ? 'python' : 'python3');
const program = `
import importlib.util
import sys
spec = importlib.util.spec_from_file_location('collector', 'scripts/finance-collect-raw-prices.py')
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
tencent = module.parse_tencent_daily('000021', '{"data":{"sz000021":{"day":[["2026-06-03","37.35","38.30","39.79","37.31","1"]]}}}')
ths = module.parse_ths_daily('000021', 'callback({"data":"20260603,37.35,39.79,37.31,38.30,1"})')
rows, differences = module.coverage_checked_rows('000021', tencent, ths, '2026-06-03', '2026-06-03')
assert rows[0].close == 38.3
assert differences == []
assert module.market_prefix('510330') == 'sh'
assert module.market_prefix('159633') == 'sz'
try:
    module.coverage_checked_rows('000021', tencent, module.parse_ths_daily('000021', 'callback({"data":""})'), '2026-06-03', '2026-06-03')
except ValueError:
    pass
else:
    raise AssertionError('missing provider date must fail')
`;
await run(python, ['-c', program], { windowsHide: true, cwd: process.cwd() });

console.log('Finance raw-price collector contract passed.');
