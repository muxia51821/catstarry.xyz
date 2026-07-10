# 🐆 豹猫粒子系统 v2.0 — 完整工程 Spec

> 版本：v2.0  
> 日期：2026-07-09  
> 作者：木下 + Kimi  
> 目标：基于 Phase 1 几何重构，修复所有已知缺陷，实现 spec 合规的完整系统  
> 约束：纯浏览器端 Three.js r128，无外部依赖，无 Blender

---

## 0. 术语表

| 术语 | 含义 |
|------|------|
| **Cat Particles** | 豹猫本体上的粒子（约 6000-8000 颗） |
| **Nebula** | 远景星云层（大、暗、慢） |
| **Stars** | 中景星尘层（小、亮、快） |
| **Hard Edges** | 二面角 > 25° 的边，构成脊骨线 |
| **Soft Edges** | 二面角 ≤ 25° 的边，构成肌肉/细分线 |
| **Skeleton Lines** | 手动定义的 5 条脊骨线（脊柱、肩胛×2、髋×2） |
| **Poisson Sampling** | 表面泊松盘采样，在网格表面均匀分布点 |
| **Spring Physics** | 质点弹簧系统：F = -k·x - c·v + noise |
| **ACES** | 电影级色调映射，防止高亮溢出 |

---

## 1. 色彩体系（强制）

### 1.1 豹猫粒子色（唯一合法色）

| Token | HEX | 用途 | 粒子类型 |
|-------|-----|------|----------|
| `--particle-gold-core` | #e0bf45`| 主发光粒子（金色） | type=0 |
| `--particle-gold-gleam` | #F0D060 | 高亮金（AWAKENING 态过渡色） | type=0 过渡 |
| `--particle-coat-brown` | #8B5E3C`| 主毛棕 | type=1 |
| `--particle-shadow-deep` | `#3A2418` | 暗影褐 | type=2 |
| `--particle-pattern-void` | `#1A0E08` | 斑纹黑 | type=3 |
| `--particle-eye-emerald` | `#4A7C59` | 瞳光翡翠绿 | type=4 |

**禁止**：`#4F71FF`、`#00E5FF`、`#6685FF` 等电光蓝/青色出现在豹猫粒子上。这些色仅属于 **Nebula/Stars 背景层** 的变体（见 1.3）。

### 1.2 线框色

| Token | HEX | alpha | 用途 |
|-------|-----|-------|------|
| `--wireframe-hard` | `#F0D060` | 0.8 | 硬边脊骨线（琥珀色） |
| `--wireframe-soft` | `#F5F5F5` | 0.15 | 细分肌肉线（半透明白） |
| `--wireframe-skeleton` | `#F0D060` | 0.9 | 手动脊骨线（最粗最亮） |

### 1.3 背景粒子色（Nebula + Stars）

背景粒子必须使用 **豹猫色的降饱和/降透明度变体**，保持色彩统一：

| 层级 | 主色 | 辅助色 | 禁止色 |
|------|------|--------|--------|
| Nebula | `#E8C547` alpha 0.08（暗金） | `#8B5E3C` alpha 0.06（暗棕） | `#4F71FF` 纯电光蓝 |
| Stars | `#E8C547` alpha 0.35（亮金） | `#3A2418` alpha 0.25（暗褐） | `#00E5FF` 纯青色 |

**规则**：背景粒子色 = 豹猫色 × 降饱和系数(0.3-0.6) × 降透明度(0.06-0.35)。

---

## 2. 几何规范（Phase 1 已验证，保留）

### 2.1 躯干
- `CatmullRomCurve3` 脊柱，5 个控制点
- `TubeGeometry` 扫掠，8 边形截面
- 半径插值：尾根 0.35 → 后腰 0.5 → 背峰 0.55 → 肩胛 0.6 → 颈根 0.45 → 头顶 0.35
- Y 轴压扁 0.85

### 2.2 头部
- `SphereGeometry(0.75, 10, 10)` + 顶点位移
- 吻部前突 1.3x、颧骨外扩 1.15x、下颌收束 0.8x、颈部压缩

### 2.3 耳朵
- 三角贝塞尔曲面片，4 顶点 2 三角面
- 左右对称，Z=±0.5，耳根厚耳尖薄

### 2.4 尾巴
- `CatmullRomCurve3` 螺旋上扬曲线，5 个控制点
- 半径指数衰减：`0.35 * (1-u)^1.5`

### 2.5 四肢
- 每腿 3 段 `TubeGeometry`（上臂→肘→前臂→掌）
- 半径逐段递减 15%
- 前腿垂直，后腿后倾 110°

### 2.6 斑纹标记
- 顶点 `rosette` attribute（Float32，0/1）
- 背部：Y>0.25 && |Z|<0.35 && X∈[-1.5, 1.0]
- 尾巴：按 u 参数正弦环纹
- 腿部：随机 30%

---

## 3. 线框规范（Phase 2 重点）

### 3.1 硬边提取（Hard Edges）

```
算法：遍历所有边，计算相邻两面法向量夹角
if 二面角 > 25° → 硬边（脊骨线）
else → 细分线
```

- **硬边**：`LineSegments`，`#F0D060` alpha 0.8，线宽 2px（通过 `glLineWidth` 或 `LineBasicMaterial.linewidth`）
- **细分线**：`LineSegments`，`#F5F5F5` alpha 0.15，线宽 1px

**禁止**直接使用 `THREE.WireframeGeometry`（会生成所有三角面对角线）。

### 3.2 手动脊骨线（Skeleton Lines）

5 条 `THREE.Line`：
1. 脊柱线（沿 `bodyPart.curve`）
2. 左肩胛线（肩峰 → 前左腿根）
3. 右肩胛线（肩峰 → 前右腿根）
4. 左髋线（后腰 → 后左腿根）
5. 右髋线（后腰 → 后右腿根）

- 颜色：`#F0D060` alpha 0.9
- 动态：AWAKENING 时最后断裂，RECOLLECTING 时最先恢复
- 线宽：3px（比硬边更粗）

### 3.3 状态透明度映射

| 状态 | 硬边 alpha | 细分线 alpha | 脊骨线 alpha |
|------|-----------|-------------|-------------|
| RESTING | 0.8 | 0.15 | 0.9 |
| AWAKENING | 0.8→0.3 | 0.15→0.05 | 0.9→0.6 |
| DISSOLVING | 0.3→0 | 0.05→0 | 0.6→0.2 |
| EXPANDING | 0 | 0 | 0.2→0 |
| AMBIENT | 0 | 0 | 0 |
| RECOLLECTING | 0→0.8 | 0→0.15 | 0→0.9 |

---

## 4. 粒子规范（Phase 2 + 3 重点）

### 4.1 表面泊松采样（Surface Poisson Disk Sampling）

**目标**：在合并后的猫网格表面生成 5000-8000 个采样点。

```
算法：
1. 计算所有三角面面积，建立面积加权概率分布
2. 按面积加权随机选面
3. 在面内用泊松盘算法采样，保证最小间距 d_min
4. 斑纹区域（rosette=1）：d_min *= 0.6（密度 ×2.78）
5. 腹部/胸口（Y<-0.2 && rosette=0）：d_min *= 1.4（密度 ×0.5）
6. 输出：position, normal, tangent, rosette, type
```

**切线计算**：
- 对于躯干/尾巴：沿脊柱曲线切线
- 对于头部/四肢：沿局部 X 轴（前后方向）
- 存储在 `tangent` attribute（Float32 × 3）

### 4.2 粒子类型分配

| 条件 | type | 颜色 |
|------|------|------|
| 眼睛区域（partId=1 && X>2.0 && |Z|<0.4） | 4 | `#4A7C59` |
| 斑纹点（rosette=1） | 3 | `#1A0E08` |
| Y>0.35 且 rosette=0 | 0 | `#E8C547` |
| Y<-0.3 | 2 | `#3A2418` |
| 其余 | 1 | `#8B5E3C` |

### 4.3 粒子形状（Shader）

**片段着色器强制要求**：

```glsl
// 形状选择（基于 gl_VertexID % 3）
float shape = mod(float(gl_VertexID), 3.0); // 0=菱形, 1=三角形, 2=方形

// 旋转（基于随机种子）
float angle = random(gl_VertexID) * 6.28318;
vec2 rot = vec2(cos(angle), sin(angle));
vec2 coord = gl_PointCoord - vec2(0.5);
coord = vec2(coord.x * rot.x - coord.y * rot.y, coord.x * rot.y + coord.y * rot.x);

// 形状 discard（无 smoothstep，锐利边缘）
if (shape < 1.0) {
  // 菱形：|x| + |y| > 0.5
  if (abs(coord.x) + abs(coord.y) > 0.5) discard;
} else if (shape < 2.0) {
  // 三角形：y > -0.5 + |x|
  if (coord.y < -0.5 + abs(coord.x)) discard;
} else {
  // 方形：max(|x|, |y|) > 0.5
  if (max(abs(coord.x), abs(coord.y)) > 0.5) discard;
}

// 无 smoothstep 柔边！alpha 只有 0 或 1
float alpha = 1.0;

// 深度 glow（基于 gl_FragCoord.z）
float depth = gl_FragCoord.z / gl_FragCoord.w;
float depthGlow = 1.0 / (1.0 + depth * 0.08);
vec3 finalColor = vColor * (0.7 + depthGlow * 0.6 * uGlow);
```

**关键**：
- 形状边缘必须是**硬 discard**，无 smoothstep 柔边
- 每粒子形状随机，旋转随机
- 斑纹点（type=3）边缘加粗（通过增大 gl_PointSize 实现）

### 4.4 混合模式

| 粒子层 | 混合模式 | 原因 |
|--------|---------|------|
| Cat Particles | `THREE.NormalBlending` | 防止重叠叠加到白，保持色彩纯度 |
| Nebula | `THREE.AdditiveBlending` | 远景朦胧，需要叠加发光 |
| Stars | `THREE.AdditiveBlending` | 星点需要叠加发光 |

---

## 5. 物理规范（Phase 4 重点）

### 5.1 质点弹簧系统

每个 Cat Particle 是一个质点，每帧受力：

```
F_spring = -k * (position - originalPosition)     // 拉回原始位置
F_damp   = -c * velocity                           // 阻尼
F_noise  = simplex3D(position * scale, time) * turbulence   // 湍流
F_radial = normalize(position) * expandForce * speedMult     // 径向爆发
F_tangent = tangent * expandForce * 0.3 * speedMult          // 毛流漂移
F_spiral = cross(normalize(position), vec3(0,1,0)) * spiralForce * speedMult  // 螺旋

velocity += (F_spring + F_damp + F_noise + F_radial + F_tangent + F_spiral) * dt
velocity *= dampingFactor
position += velocity * dt
```

### 5.2 Simplex 噪声

必须实现 **3D Simplex Noise**（GLSL 内联），禁止用 `Math.sin(i*0.13)` 做伪随机。

参考实现：`https://github.com/stegu/webgl-noise/blob/master/src/noise3D.glsl`

### 5.3 状态参数映射

| 状态 | k | c | turbulence | expandForce | spiralForce | damping | 过渡时间 |
|------|---|---|-----------|------------|------------|---------|---------|
| RESTING | 80.0 | 15.0 | 0.0 | 0.0 | 0.0 | 0.90 | — |
| AWAKENING | 40.0 | 8.0 | 0.02 | 0.0 | 0.0 | 0.92 | 0.4s |
| DISSOLVING | 5.0 | 2.0 | 0.08 | 0.2 | 0.1 | 0.95 | 0.8s |
| EXPANDING | 0.5 | 1.0 | 0.15 | 2.0 | 0.8 | 0.96 | 1.2s |
| AMBIENT | 0.1 | 0.5 | 0.05 | 0.0 | 0.2 | 0.98 | — |
| RECOLLECTING | 60.0→80.0 | 10.0 | 0.01 | 0.0 | 0.0 | 0.88 | 0.6s |

**参数过渡**：状态切换时，所有物理参数在 0.3s 内渐变到目标值（`lerp(current, target, dt * 3.0)`），禁止突变。

### 5.4 速度分层（保留）

| type | speedMult |
|------|-----------|
| 0 金 | 1.0 |
| 1 棕 | 0.7 |
| 2 褐 | 0.4 |
| 3 黑 | 0.3 |
| 4 翡翠 | 0.9 |

乘在 `F_radial`、`F_tangent`、`F_spiral` 上。

---

## 6. 渲染规范

### 6.1 ACES 色调映射

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
```

防止高亮色彩（金色 glow）直接溢出到白。

### 6.2 背景粒子参数

#### Nebula（远景）
- 数量：400
- 尺寸：1.5-4.0 px（**禁止 > 4px**）
- alpha：0.06-0.12（**禁止 > 0.15**）
- 颜色：暗金 `#E8C547` alpha 0.08、暗棕 `#8B5E3C` alpha 0.06
- 运动：极慢漂移（±0.003），边界环绕
- 形状：圆形（`length(c)`），允许柔边（远景需要朦胧）

#### Stars（中景）
- 数量：800
- 尺寸：0.8-2.0 px（**禁止 > 2.5px**）
- alpha：0.25-0.45（**禁止 > 0.5**）
- 颜色：亮金 `#E8C547` alpha 0.35、暗褐 `#3A2418` alpha 0.25
- 运动：较快漂移（±0.008）+ Simplex 扰动
- 形状：菱形（锐利边缘）
- glow：0.6（**禁止 > 0.8**）

### 6.3 雾效

```js
scene.fog = new THREE.FogExp2(0x0A0A0C, 0.012);  // 从 0.018 降低，减少远景压抑感
```

---

## 7. 状态机（保留 Phase 1 逻辑，增强物理）

| 状态 | 持续时间 | 触发条件 | 核心表现 |
|------|---------|---------|---------|
| RESTING | 无限 | 默认 | 线框完整，粒子微弱呼吸，Y 轴 ±5° 自转 |
| AWAKENING | 0.4s | Hover | 细分线先断裂，硬边后断裂，粒子亮度激增 |
| DISSOLVING | 0.8s | 自动 | 线框消失，粒子脱离网格，布朗运动，五色色谱 |
| EXPANDING | 1.2s | 点击展开 | 粒子 3D 径向爆发，金色先锋，黑色锚点 |
| AMBIENT | 无限/4s | 自动 | 稀薄粒子漂浮，偶尔聚集成局部几何面 |
| RECOLLECTING | 0.6s | 鼠标离开/点击收起 | 弹性吸附回核心，线框重新浮现 |

---

## 8. 响应式

| 断点 | 粒子数 | 卡片尺寸 | 其他 |
|------|--------|---------|------|
| Desktop (≥1024px) | 5000-6000 | 420×480 | 完整效果 |
| Tablet (640-1023px) | 4000 | 80vw | 简化动画 |
| Mobile (<640px) | 2000 | calc(100vw-32px) | 触控触发、粒子数减半、无脊骨线 |

---

## 9. 代码架构（强制分层）

```
LeopardCatSystem
├── GeometryBuilder          // 第 1 层：几何生成
│   ├── buildBody()          // CatmullRom + TubeGeometry
│   ├── buildHead()          // Sphere + displacement
│   ├── buildEars()          // Bezier patch
│   ├── buildTail()          // Spiral curve + exp decay
│   ├── buildLegs()          // Segmented tubes
│   └── mergeAndMark()       // Merge + rosette attribute
├── WireframeBuilder         // 第 2 层：线框
│   ├── extractHardEdges()   // 二面角 > 25°
│   ├── extractSoftEdges()   // 二面角 ≤ 25°
│   └── buildSkeletonLines() // 5 条手动脊骨线
├── ParticleSampler          // 第 3 层：泊松采样
│   └── poissonSample()      // 5000-8000 points
├── PhysicsEngine            // 第 4 层：物理
│   ├── simplex3D()          // GLSL Simplex noise
│   ├── stateParams          // {k, c, turbulence, ...}
│   └── update()             // 每帧质点更新
├── ParticleRenderer         // 第 5 层：渲染
│   ├── buildCatShader()     // NormalBlending, 硬边形状
│   ├── buildNebulaShader()  // AdditiveBlending, 柔边圆形
│   └── buildStarShader()    // AdditiveBlending, 硬边菱形
└── StateMachine             // 第 6 层：状态
    ├── transitionTo()
    └── update()
```

**禁止**：所有逻辑挤在一个 `animate()` 函数里。必须按上述分层组织。

---

## 10. 验收清单

### 10.1 致命 Bug（必须 100% 通过）
- [ ] 无 `ReferenceError` 或 `TypeError`
- [ ] 所有材质变量在 `animate()` 调用前已定义
- [ ] 状态切换不崩溃

### 10.2 设计体系合规
- [ ] 豹猫粒子只用 1.1 节的 5 色 + 1 过渡色
- [ ] 背景粒子只用 1.3 节的降饱和变体
- [ ] 无 `#4F71FF` / `#00E5FF` / `#6685FF` 纯电光蓝出现在猫粒子上
- [ ] Cat Particles 使用 `NormalBlending`
- [ ] Nebula/Stars 使用 `AdditiveBlending`
- [ ] 粒子形状硬 discard，无 smoothstep 柔边
- [ ] 启用 `ACESFilmicToneMapping`

### 10.3 形态识别
- [ ] 3 秒内识别为猫科动物
- [ ] 能看出弓背、长尾、尖耳
- [ ] 背部和尾巴有斑纹密度差异

### 10.4 线框质量
- [ ] 硬边（琥珀色）+ 细分线（半透明白）+ 脊骨线（最亮）三层
- [ ] 细分线先断裂，脊骨线最后断裂
- [ ] 回收时脊骨线最先恢复

### 10.5 粒子质量
- [ ] 5000-8000 颗（桌面），不卡顿
- [ ] 斑纹区域密度明显高于腹部
- [ ] 扩散时有毛流感（切线漂移）
- [ ] 回收时有弹性吸附感（非线性 lerp）
- [ ] Simplex 噪声扰动（非同步 sin）

### 10.6 背景质量
- [ ] Nebula 朦胧、大、暗、慢
- [ ] Stars 锐利、小、亮、快
- [ ] 无"LED 灯珠"感
- [ ] 无"前景物体"感

### 10.7 响应式
- [ ] 移动端粒子数 2000
- [ ] 触控交互正常
- [ ] 卡片宽度自适应

---

## 11. 已知坑（不要踩）

1. **GLSL `mod()` 对负数行为异常**：用 `fract()` 替代或确保正数输入
2. **Three.js r128 `LineBasicMaterial.linewidth`**：WebGL 限制线宽为 1px，需用 `glLineWidth` 或模拟粗线（TubeGeometry 小管）
3. **Simplex Noise 在 GLSL 中**：注意 `perm` 纹理的 wrap 模式，或直接用数学实现（无纹理依赖）
4. **Poisson Sampling 性能**：避免 O(n²) 距离检查，用网格加速（spatial hash）
5. **BufferGeometry 动态更新**：修改 `position` array 后必须设 `needsUpdate = true`
6. **ACES 色调映射**：会使暗部更暗，需适当提高 `toneMappingExposure`

---

## 12. 参考资源

- Three.js TubeGeometry: https://threejs.org/docs/#api/en/geometries/TubeGeometry
- Three.js EdgesGeometry: https://threejs.org/docs/#api/en/geometries/EdgesGeometry
- Three.js ACESFilmicToneMapping: https://threejs.org/docs/#api/en/renderers/WebGLRenderer.toneMapping
- Simplex Noise GLSL: https://github.com/stegu/webgl-noise/blob/master/src/noise3D.glsl
- Poisson Disk Sampling: https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
- 当前基线代码：`phase1_geometry_rebuild.html`（仅几何部分可用，线框/粒子/物理需重写）
