# 🐆 豹猫粒子系统 — Agent 实现文档

> 版本：v1.0  
> 目标：将当前粗糙的程序化豹猫升级为参数化曲面 + 表面泊松采样 + 弹簧物理的有机形态  
> 约束：纯浏览器端 Three.js / WebGL，不依赖 Blender 等桌面端工具  
> 设计系统：catstarry.xyz Design System v1.4（Home 画布）

---

## 1. 项目背景

Home 页右下角 About 卡片中嵌入一只几何抽象豹猫，作为品牌视觉签名。当前实现为手写 `sin/cos` 循环生成的低多边形网格，形态粗糙、缺乏豹猫识别特征。需在纯浏览器端完成升级。

---

## 2. 当前状态（Current State）

- **渲染引擎**：Three.js r128（CDN 引入）
- **几何生成**：手写 `for` 循环硬插顶点，6 边形截面拉伸成躯干，粗糙球面做头，三角锥做耳，单线管做尾
- **线框**：`THREE.WireframeGeometry` 全三角对角线渲染
- **粒子**：`THREE.Points` + `BufferGeometry`，一顶点一粒子，菱形 discard shader
- **动画**：状态机驱动，线性插值（lerp）控制位置，无物理
- **色彩**：5 色粒子（金/棕/褐/黑/翡翠绿），线框 `#F5F5F5`
- **状态机**：RESTING → AWAKENING → DISSOLVING → EXPANDING → AMBIENT → RECOLLECTING

---

## 3. 目标状态（Target State）

| 维度 | 当前 | 目标 |
|------|------|------|
| **躯干** | 直筒椭圆截面 | 沿 Catmull-Rom 脊柱扫掠，肩宽→腰细→臀宽的有机弓背 |
| **头部** | 粗糙球面 | 多椭球并集（颅骨+吻部+颧骨），有下颌收束 |
| **耳朵** | 三角锥 | 三角贝塞尔曲面片，耳根厚、耳尖薄、耳背凹 |
| **尾巴** | 单线等粗管 | 沿螺旋曲线扫掠，半径指数衰减（粗基→细尖） |
| **四肢** | 单线段 | 分段关节管（上臂→肘→前臂→掌→指） |
| **斑纹** | 无 | 背部/四肢/尾巴区域粒子密度 ×2-3，颜色标记为斑纹黑 |
| **线框** | 全三角对角线 | 硬边（二面角>25°）+ 手动脊骨线，粗细分层 |
| **粒子** | 顶点即粒子 | 表面泊松盘采样，数量 3000-5000，带毛流方向 |
| **动画** | 线性插值 | 弹簧物理（k/c/noise），状态切换即参数渐变 |
| **渲染** | 全局 uniform glow | 基于深度的局部 glow + 粒子形状旋转 |

---

## 4. 技术约束（Hard Constraints）

1. **纯浏览器端**：只能用 Three.js / WebGL / GLSL，禁止 Blender / Python / 服务器端生成
2. **性能预算**：桌面 60fps @ 5000 粒子，移动端降级至 2000 粒子 + 简化动画
3. **CDN 引入**：Three.js 通过 `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` 引入，禁止 npm / bundler 假设
4. **Design System 兼容**：
   - 颜色必须使用文档定义的 Token（金/棕/褐/黑/翡翠绿/线框白/电光蓝）
   - 卡片样式遵循 `card-about`：20px 圆角、无投影、`#1A2030` 半透明底、blur(24px)
   - 字体栈 `--font-display` / `--font-body`
   - 动效曲线 `cubic-bezier(0.19, 1, 0.22, 1)`
5. **状态机保留**：5 状态机逻辑不变，只改内部物理和渲染
6. **响应式**：移动端卡片宽度 `calc(100vw - 32px)`，min-height 360px，粒子数减半

---

## 5. 模块详细规范

### 5.1 几何模块（Geometry）

#### 5.1.1 躯干（Body）
- **基础**：`THREE.CatmullRomCurve3` 定义脊柱，6 个控制点
  ```
  尾根(-2.0, 0.3, 0) → 后腰(-1.0, 0.5, 0) → 背峰(0.0, 0.6, 0)
  → 肩胛(1.0, 0.4, 0) → 颈根(1.8, 0.2, 0) → 头顶(2.2, 0.1, 0)
  ```
- **扫掠**：`THREE.TubeGeometry` 但自定义 `radius` 函数
  - 尾根：0.4，后腰：0.55，背峰：0.5，肩胛：0.6，颈根：0.35，头顶：0.2
  - 截面为 8 边形（非 6 边形），带轻微上下压扁（Y 轴缩放 0.85）
- **姿态**：默认侧视，脊柱在 X-Y 平面，Z 为厚度

#### 5.1.2 头部（Head）
- **颅骨**：`THREE.SphereGeometry(0.9, 8, 8)`，顶点位移：
  - 前部（X>0.3）沿 X 轴拉伸 1.3 倍 → 形成吻部前突
  - 两侧（\|Z\|>0.4）沿 Z 轴拉伸 1.15 倍 → 形成颧骨
  - 下部（Y<-0.3）沿 Y 轴压缩 0.8 倍 → 形成下颌收束
- **耳朵**：左右各一个，由 4 个顶点构成的三角贝塞尔曲面片
  - 耳根宽 0.5、厚 0.15，耳尖宽 0.1、厚 0.05，耳背凹曲率
  - 位置：颅骨顶部两侧，Z=±0.5，Y=0.7
- **眼睛**： emerald 色标记点，位于吻部上方，Z=±0.32，X=0.35，Y=0.05
- **鼻子**：单点，X=0.55，Y=-0.15，Z=0

#### 5.1.3 尾巴（Tail）
- **曲线**：`THREE.CatmullRomCurve3`，从尾根向后下方延伸，带螺旋上扬
  ```
  (-2.0, 0.3, 0) → (-2.8, 0.1, 0.2) → (-3.5, -0.3, -0.1)
  → (-4.0, 0.2, 0.3) → (-4.2, 0.8, 0)
  ```
- **半径函数**：指数衰减 `radius(u) = 0.35 * Math.pow(1 - u, 1.5)`，u∈[0,1]
- **截面**：6 边形

#### 5.1.4 四肢（Legs）
- 4 条腿，每条由 3 段 `TubeGeometry` 拼接：
  1. **上臂/大腿**：从躯干连接点到肘/膝，长度 0.7，半径 0.18
  2. **前臂/小腿**：从肘/膝到腕/踝，长度 0.6，半径 0.14
  3. **掌/指**：从腕/踝到地面，长度 0.3，半径 0.1→0.05 锥形
- 前腿位置：X=1.0, Y=-0.4, Z=±0.4
- 后腿位置：X=-1.0, Y=-0.4, Z=±0.4
- 前腿垂直向下，后腿略向后倾斜（膝关节角度 110°）

#### 5.1.5 斑纹标记（Rosette Markers）
- 在生成几何后，遍历顶点，按位置标记斑纹属性：
  - **背部斑纹**：Y > 0.2 且 \|Z\| < 0.3 且 X ∈ [-1.5, 1.0] → 斑纹密度高
  - **尾环**：尾巴顶点按 u 参数每隔 0.15 标记一环 → 尾环粒子
  - **四肢斑点**：腿部顶点随机 30% 标记为斑点
- 存储在 `geometry.attributes.rosette`（Float32，0=无，1=斑纹）

### 5.2 线框模块（Wireframe）

#### 5.2.1 硬边提取
- 遍历所有边，计算相邻两面法向量的二面角
- 二面角 > 25° → **硬边**（脊骨线），`LineBasicMaterial` 2px 等效（通过 gl_PointSize 或 LineSegments 模拟）
- 二面角 ≤ 25° → **细分线**（肌肉走向），1px 等效，alpha 0.2
- 禁止直接使用 `THREE.WireframeGeometry`

#### 5.2.2 手动脊骨线
- 额外定义 5 条手动脊骨线（`THREE.Line`）：
  1. 脊柱线（沿 Catmull-Rom 曲线）
  2. 左肩胛线（肩峰 → 前腿根）
  3. 右肩胛线
  4. 左髋线（腰后 → 后腿根）
  5. 右髋线
- 脊骨线在 AWAKENING 时最后断裂，RECOLLECTING 时最先恢复

### 5.3 粒子模块（Particles）

#### 5.3.1 表面泊松采样（Surface Poisson Disk Sampling）
- 在最终合并的猫网格表面采样 4000-6000 个点
- 算法要点：
  1. 按三角面面积加权随机选面
  2. 在面内用泊松盘算法采样，保证最小间距 `d_min`
  3. **斑纹区域**：`d_min *= 0.6`（密度 ×2.78）
  4. **腹部/胸口**：`d_min *= 1.4`（密度 ×0.5）
- 输出：每个采样点包含 `position`, `normal`, `tangent`, `uv`, `rosette`

#### 5.3.2 粒子属性
- **position**：采样点世界坐标（作为原始位置）
- **normal**：表面法线（回收时沿法线先回表面）
- **tangent**：沿脊柱切线（扩散时沿切线有优先速度）
- **rosette**：0/1 斑纹标记
- **type**：0=金, 1=棕, 2=褐, 3=黑, 4=翡翠
  - 斑纹点（rosette=1）→ type=3（斑纹黑）
  - 眼睛点 → type=4（翡翠）
  - Y>0.3 且 rosette=0 → type=0（金）
  - Y<-0.2 → type=2（褐）
  - 其余 → type=1（棕）
- **size**：1.5-5.0 px 随机，斑纹点偏大

#### 5.3.3 粒子形状（Shader）
- 顶点着色器：标准 `modelViewMatrix` + `projectionMatrix`
- 片段着色器：
  - 支持 3 种形状：菱形（默认）、三角形（尖端粒子）、方形（鳞片感）
  - 每粒子随机旋转角度（基于 `gl_VertexID`）
  - 基于深度的 glow 衰减：`glow *= 1.0 / (1.0 + depth * 0.1)`
  - 斑纹点（rosette=1）边缘加粗

### 5.4 动画模块（Physics）

#### 5.4.1 质点弹簧系统
每个粒子是一个质点，每帧受三个力：

```
F_spring = -k * (position - originalPosition)   // 拉回原始位置
F_damp   = -c * velocity                          // 阻尼
F_noise  = simplex3D(position * scale, time) * turbulence  // 湍流
F_radial = normalize(position) * expandForce      // 径向爆炸（EXPANDING 态）
F_spiral = cross(normalize(position), up) * spiralForce   // 螺旋力

velocity += (F_spring + F_damp + F_noise + F_radial + F_spiral) * dt
velocity *= dampingFactor
position += velocity * dt
```

#### 5.4.2 状态参数映射

| 状态 | k（弹性） | c（阻尼） | turbulence | expandForce | spiralForce | damping |
|------|-----------|-----------|------------|-------------|-------------|---------|
| RESTING | 80.0 | 15.0 | 0.0 | 0.0 | 0.0 | 0.90 |
| AWAKENING | 40.0 | 8.0 | 0.02 | 0.0 | 0.0 | 0.92 |
| DISSOLVING | 5.0 | 2.0 | 0.08 | 0.2 | 0.1 | 0.95 |
| EXPANDING | 0.5 | 1.0 | 0.15 | 2.0 | 0.8 | 0.96 |
| AMBIENT | 0.1 | 0.5 | 0.05 | 0.0 | 0.2 | 0.98 |
| RECOLLECTING | 60.0 → 80.0 | 10.0 | 0.01 | 0.0 | 0.0 | 0.88 |

- 状态切换时，参数在 0.3s 内渐变到目标值（防止突变）
- 回收态的 k 从 60 渐变到 80，模拟"越接近越紧"的吸附感

#### 5.4.3 速度分层（保留原设计）
- 金（type=0）：1.0x
- 棕（type=1）：0.7x
- 褐（type=2）：0.4x
- 黑（type=3）：0.3x
- 翡翠（type=4）：0.9x
- 乘在 `F_radial` 和 `F_spiral` 上

### 5.5 渲染模块（Rendering）

#### 5.5.1 深度 Glow
片段着色器中：
```glsl
float depth = gl_FragCoord.z / gl_FragCoord.w;
float depthGlow = 1.0 / (1.0 + depth * 0.05);
vec3 finalColor = particleColor * (0.6 + depthGlow * 0.8 * uGlow);
```

#### 5.5.2 粒子形状混合
```glsl
// 根据 particleType 和随机种子选择形状
float shape = mod(float(gl_VertexID), 3.0); // 0=菱形, 1=三角, 2=方形
float rotation = random(gl_VertexID) * 6.28318;
// 在 gl_PointCoord 中旋转坐标后做形状 discard
```

#### 5.5.3 线框渲染
- 硬边线：`THREE.LineSegments`，`LineBasicMaterial`，颜色 `#F5F5F5`，alpha 0.7
- 细分线：同材质，alpha 0.15
- 脊骨线：单独 `THREE.Line`，颜色 `#F0D060`（琥珀高亮），alpha 0.9，动态粗细
- 线框在 DISSOLVING 态时从细分线开始消失，最后消失脊骨线

---

## 6. 代码架构建议

```
LeopardCatSystem
├── GeometryBuilder
│   ├── buildSpine() → CatmullRomCurve3
│   ├── buildBody(spine) → TubeGeometry
│   ├── buildHead() → SphereGeometry + displacement
│   ├── buildEars() → custom BufferGeometry
│   ├── buildTail() → TubeGeometry
│   ├── buildLegs() → Array<TubeGeometry>
│   └── mergeAndMark() → BufferGeometry + rosette attribute
├── WireframeBuilder
│   ├── extractHardEdges(geometry) → LineSegments
│   ├── extractSoftEdges(geometry) → LineSegments
│   └── buildSkeletonLines() → Array<Line>
├── ParticleSampler
│   └── poissonSample(geometry, count) → {position, normal, tangent, rosette}
├── PhysicsEngine
│   ├── stateParams: {k, c, turbulence, expand, spiral, damping}
│   ├── update(particles, dt) → void
│   └── simplex3D(x, y, z, t) → float
├── ParticleRenderer
│   ├── buildShaderMaterial() → ShaderMaterial
│   └── updateUniforms(state, time) → void
└── StateMachine
    ├── currentState
    ├── transitionTo(state)
    └── update(dt) → stateParams
```

---

## 7. 与 Design System 的映射

| 设计文档 Token | 实现位置 | 说明 |
|----------------|----------|------|
| `--particle-gold-core` `#E8C547` | 粒子 type=0 | 主发光粒子 |
| `--particle-gold-gleam` `#F0D060` | 脊骨线颜色 | 高亮脊骨线 |
| `--particle-coat-brown` `#8B5E3C` | 粒子 type=1 | 次级体积 |
| `--particle-shadow-deep` `#3A2418` | 粒子 type=2 | 深处粒子 |
| `--particle-pattern-void` `#1A0E08` | 粒子 type=3 | 斑纹粒子 |
| `--particle-eye-emerald` `#4A7C59` | 粒子 type=4 | 眼睛粒子 |
| `--wireframe-dark-bg` `#F5F5F5` alpha 0.6 | 硬边/细分线 | 全息线框 |
| `--particle-core` `#4F71FF` | 环境背景粒子 | 电光蓝星尘 |
| `--home-surface-card` `#1A2030` | About 卡片背景 | 半透明底 |
| `--radius-home` 20px | 卡片 border-radius | 圆角 |
| `--ease-monopo` | 所有 transition | 动效曲线 |

---

## 8. 验收标准

### 8.1 形态识别
- [ ] 非用户提示下，3 秒内能识别为"猫科动物"
- [ ] 能看出弓背、长尾、尖耳的豹猫特征
- [ ] 背部和尾巴有斑纹/环纹暗示（通过粒子密度差异）

### 8.2 线框质量
- [ ] 线框不像蜘蛛网，有清晰的脊柱和四肢主轴
- [ ] 细分线暗淡，脊骨线高亮，层次分明
- [ ] AWAKENING 时细分线先断裂，脊骨线后断裂

### 8.3 粒子质量
- [ ] 粒子数量 4000-6000，不卡顿（桌面 60fps）
- [ ] 斑纹区域密度明显高于腹部
- [ ] 扩散时有毛流感（沿切线漂移），不是纯径向爆炸
- [ ] 回收时有弹性吸附感，不是线性插值

### 8.4 状态机
- [ ] 5 状态完整运行，过渡平滑
- [ ] RESTING 时有微弱呼吸闪烁
- [ ] EXPANDING 时金色粒子最快，黑色最慢，形成先锋层
- [ ] RECOLLECTING 时粒子先沿法线回表面，再滑向顶点

### 8.5 响应式
- [ ] 移动端粒子数自动降至 2000
- [ ] 卡片宽度自适应
- [ ] 触控交互正常（hover 改为 touch 触发）

---

## 9. 参考资源

- **Three.js TubeGeometry**：https://threejs.org/docs/#api/en/geometries/TubeGeometry
- **Three.js ParametricGeometry**：https://threejs.org/docs/#api/en/geometries/ParametricGeometry
- **Poisson Disk Sampling 算法**：https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf
- **Simplex Noise**：https://github.com/stegu/webgl-noise（GLSL 版）
- **当前实现文件**：`about_card_with_leopard_cat.html`（基线代码）

---

## 10. 开发顺序建议

1. **Phase 1：几何重构**（TubeGeometry 躯干 + 多椭球头部 + 指数尾巴）
2. **Phase 2：线框重构**（硬边提取 + 脊骨线手动定义）
3. **Phase 3：粒子重构**（泊松采样 + 斑纹标记 + 毛流方向）
4. **Phase 4：物理重构**（弹簧系统 + simplex 湍流 + 状态参数映射）
5. **Phase 5：渲染 polish**（深度 glow + 形状混合 + 移动端降级）
