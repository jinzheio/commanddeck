# 2026年了，为什么你的 `require` 还在报错？CommonJS 与 ESM 的恩怨消亡史与最佳实践

## 一个挠头的 bug

刚修复了 CommandDeck 的一个黑屏 bug。控制台报 `Uncaught ReferenceError: require is not defined`。

排查发现，根目录 `package.json` 设置了 `"type": "module"`，这导致 Electron 的 Preload 脚本在加载时尝试以 ESM 的方式加载 CommonJS 模块。解决方案：
1.  新建 `tsconfig.preload.json`，强制指定 `"module": "CommonJS"`，防止它继承根目录的 ESM 配置。
2.  在 `src/preload` 目录下新建一个只有 `{ "type": "commonjs" }` 的 `package.json`，强行覆盖根目录的 ESM 设定。

趁热打铁，写一篇 CommonJS 和 ESM 的辨析帖。

## CommonJS (CJS) vs ECMAScript Modules (ESM)

在深入配置之前，我们必须先接受一个事实：**JavaScript 实际上分裂成了两个世界**。

### 1. CommonJS (CJS) —— Node.js 老国王
*   **特征**：`require()` / `module.exports`
*   **哲学**：动态、同步。文件加载是运行时发生的。
*   **主场**：旧版 Node.js 服务、构建脚本、以及很多 Electron 项目的**主进程**（尽管 Node.js 和 Electron 现已原生支持 ESM，但生态迁移尚需时日）。
*   **痛点**：无法被 Tree-shaking 完美优化，浏览器原生不支持。

### 2. ESM (ES Modules) —— 现代 Web 新皇帝
*   **特征**：`import` / `export`
*   **哲学**：静态、异步。依赖关系在代码运行前就已经确定。
*   **主场**：浏览器、Vite/Webpack 构建的前端应用、现代 Deno/Bun 运行时。
*   **优势**：原生支持，更好的工具链集成，Tree-shaking 友好。

---

## `package.json` 中的 `type`

Node.js 在 v12+ 引入了 ESM 支持，但这开启了混乱之门。Node 怎么知道一个 `.js` 文件是 CJS 还是 ESM？答案就在 `package.json`。

### 规则一：默认是 CJS
如果你的 `package.json` **没有** `type` 字段，或者写着 `"type": "commonjs"`：
- 所有 `.js` 文件都被视为 **CommonJS**。
- 你**不能**在 `.js` 文件里使用 `import`（除非你用 Babel/TS 编译过，但那是另一回事）。

### 规则二：`"type": "module"` 才是 ESM
如果你加了 `"type": "module"`：
- 所有 `.js` 文件默认被视为 **ESM**。
- 你**可以**自由使用 `import`。
- 此时，如果你想用 `require`，Node 会直接报错（除非你用 `.cjs` 扩展名）。

### 规则三：扩展名拥有最高解释权
无论 `package.json` 怎么写，扩展名永远是即使生效的“特权卡”：
- **`.cjs`**：永远是 CommonJS。就算你在 `"type": "module"` 的包里，`.cjs` 依然可以用 `require`。
- **`.mjs`**：永远是 ESM。就算你在老旧的 CJS 项目里，`.mjs` 依然可以用 `import`。

> 💡 **最佳实践 #1**：
> 新项目一律在 `package.json` 中设置 `"type": "module"`。
> 遇到必须使用 CJS 的配置文件（如某些老旧的 `postcss.config.js` 工具），将其重命名为 `postcss.config.cjs`。

---

## TypeScript 障眼法和 `moduleResolution`

在 TypeScript 代码里写的是 `import`，编译后完全可能会变成 `require`，——这取决于 `tsconfig.json` 中的 `module` 字段。

### 场景 A：前端项目 (Vite/React/Vue)
现代前端构建工具（Vite, Webpack）通常不依赖 TS 来处理模块加载，而是自己处理。
- **推荐配置**：
  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "module": "ESNext",
      "moduleResolution": "bundler" // TS 5.0+ 新标准，告诉 TS "不管具体细节，反正打包工具会搞定"
    }
  }
  ```

### 场景 B：Node.js 后端 / Electron 主进程
这里没有打包工具（或者仅仅是 tsc 编译），Node.js 原生执行代码。这时候 TS 的配置必须**精准匹配** Node 的行为。
- **推荐配置**：
  ```json
  // tsconfig.json
  {
    "compilerOptions": {
      "module": "NodeNext", // 或 Node16
      "moduleResolution": "NodeNext"
    }
  }
  ```
  使用 `NodeNext` 时，TS 会强制通过文件扩展名（`.mts`, `.cts`）来决定输出的 JS 是 CJS 还是 ESM。这是一个**非常严格但安全**的模式。

---

## ⚡ Electron 的特殊战场：CJS 与 ESM 的混战

Electron 是最容易踩坑的地方，因为它同时包含两个环境：
1.  **Main Process (Node.js)**：传统上是 CJS 环境。虽然现在支持 ESM，但为了兼容性和启动速度，很多脚手架依然默认 CJS。
2.  **Renderer Process (Chromium)**：纯粹的 Web 环境，Vite 驱动，妥妥的 ESM。

**💥 经典也是最痛的坑：`preload` 脚本**
Preload 脚本运行在渲染进程之前，但它又有 Node.js 权限。
- 如果你的项目是 `"type": "module"`，而 Preload 脚本被编译成了 ESM（有 `import`），但 Electron 的沙箱加载机制在某些版本下可能期待 CJS，或者反过来，就会报 `SyntaxError`。
- **解决方案**：通常让 Preload 脚本编译为 CJS，或者在 `vite.config.ts` 中明确指定构建目标。

---

## ✅ 2026 避坑指南 & 最佳实践清单

1.  **拥抱 ESM，但留好退路**：
    所有新项目的 `package.json` 加上 `"type": "module"`。这是未来。

2.  **文件扩展名是救命稻草**：
    不要害怕使用 `.cjs` 和 `.mjs`。
    *   **对于配置文件**：直接修改**源文件后缀**（例如把 `postcss.config.js` 重命名为 `postcss.config.cjs`），让工具明确知道怎么加载它。
    *   **对于构建产物**：配置你的打包工具（Vite/Webpack）让它输出正确的后缀（例如配置 `rollupOptions` 输出 `preload.cjs`）。
    *   **警告**：**千万不要手动修改 `dist/` 里的文件**，那只是临时掩盖问题，下次构建又会复发。

3.  **TS 配置分而治之**：
    不要试图用一个 `tsconfig.json` 覆盖全栈。
    - **App/Frontend**: `tsconfig.web.json` -> `"moduleResolution": "bundler"`
    - **Server/Scripts**: `tsconfig.node.json` -> `"moduleResolution": "NodeNext"`

4.  **环境变量与全局类型定义 (Global Types)**：
    遇到 `process.env` (Node) 或 `import.meta.env` (Vite) 报错时，这是因为 TS 不知道这些全局变量的存在。
    - **`process` 定义**：安装 `@types/node`。它向 TS 全局作用域注入了 `process`、`Buffer`、`__dirname` 等 Node.js 专属对象的类型定义。
    - **`import.meta.env` 定义**：Vite 项目需确保引用 `/// <reference types="vite/client" />`。它告诉 TS `import.meta` 对象上多了个 `env` 属性，且符合 `ImportMetaEnv` 接口。

5.  **库开发者的自我修养**：
    如果你在开发一个 NPM 包，请务必使用 `exports` 字段同时支持 CJS 和 ESM：
    ```json
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs"
      }
    }
    ```

## 🎤 Q&A

### Q1: `package.json` 中的 `type` 和 `tsconfig.json` 的 `compilerOptions` 到底是啥关系？
**A: 一个管“身份”，一个管“产出”，互不隶属但必须配合。**
*   **`package.json` ("type")**: 这是**运行时**（Node.js）的身份证。它告诉 Node.js：“凡是 `.js` 文件，默认当成 CJS 还是 ESM 处理？”
*   **`tsconfig.json` ("compilerOptions")**: 这是**编译时**（TypeScript）的说明书。它告诉 tsc：“把我的 `.ts` 代码翻译成什么语法的 `.js` 代码？”
**经典冲突**：`tsconfig` 输出了 ESM 语法的代码（`import`），但 `package.json` 没写（默认 CJS），Node.js 运行时就会报错。此时 TS 没错，由 Node 判死刑。

### Q2: `tailwind.config.ts` 也会涉及 CommonJS/ESM 问题吗？
**A: v3 是重灾区，但 v4 已经“消灭”了这个问题。**
*   **Tailwind v3**: 它的配置文件运行在 Node 环境。即使是 `.ts` 后缀，也常因为 `ts-node` 或打包工具配置不当导致 ESM/CJS 冲突。这也解释了为什么有时改成 `tailwind.config.cjs` 能光速解决问题。
*   **Tailwind v4**: 拥抱了 CSS-first 配置，默认不再依赖 `tailwind.config.js/ts` 文件，直接在 CSS 中通过 `@theme` 配置，彻底绕过了 JS 模块规范的坑。

### Q3: 既然写了 `module: ESNext`，为什么还会报 `require` 不存在？
**A: 这是一个经典的“时空错乱”问题。**
当你设置 `module: ESNext` 时，TypeScript 编译器（或转译器）会**保留**你的 `import` 语句，输出 ESM 格式的代码。
如果这个代码随后被扔进了一个**默认是 CJS** 的环境（比如默认配置的 Electron 主进程）里运行，Node.js 看到 `import` 就会报错。
反之，如果你在 TS 里写了 `require`，但配置输出 ESM，浏览器运行时就会报错 `require is not defined`。
**配置位置指引**：
*   **编译器行为**：`tsconfig.json` -> `compilerOptions` -> `"module": "ESNext"` (决定输出的代码格式)。
*   **运行环境行为**：`package.json` -> `"type": "commonjs"` (或缺省) 决定了 Electron 主进程或 Node 运行时怎么去理解加载进来的文件。

### Q4: `tree-shaking` 到底是什么？为什么 CommonJS 做不到？
**A: 摇树优化（Tree-shaking）= “把没用的叶子摇下来”。**
比如你引用了 `lodash` 的一个函数。此机制可以把你没用到的其他 99% 的代码在打包时剔除。
*   **ESM**：静态结构，构建工具（Rollup/Wapak）在看代码第一眼就知道你依赖了啥，没用的一刀切。
*   **CommonJS**：`require()` 是动态的，可能出现在 `if` 语句里，可能拼接变量。构建工具不敢随便删代码，怕删错了运行时崩溃。所以 CJS 包通常体积更大。

### Q5: 为什么说“退回 CJS 或 .mjs”是同一种稳健策略？
**A: 因为它们都在“拒绝歧义”。**
Node.js 处理 `.js` 文件时需要去查 `package.json` 的 `type` 字段，这个过程容易受到上下文（比如 Monorepo 根目录配置）的影响。
*   **`.cjs`**: 明确告诉 Node "我是 CommonJS"，不管 `package.json` 说啥。
*   **`.mjs`**: 明确告诉 Node "我是 ESM"，不管 `package.json` 说啥。
**稳健的核心在于**：通过文件后缀**硬编码**加载模式，消除了环境配置不一致带来的不确定性。

### Q6: 我们的老朋友 Nextjs 在这方面有什么特殊之处？
**A: Next.js 是集大成者，也是公认的前端黑盒大王。**
Next.js (App Router) 实际上混合了两种环境：
1.  **Server Components**: 运行在 Node.js (或 Edge) 环境。
2.  **Client Components**: 打包后运行在浏览器。
**但是！** Next.js 的编译器（SWC/TurboPack）非常智能。它允许你在所有地方写 `import/export` (ESM 语法)。
*   对于服务端，它会根据你的 `next.config.js` 和环境自动转译成 Node 能跑的代码（CommonJS 或 Node-ESM）。
*   对于客户端，它会打包成浏览器能跑的代码。
**注意点**：`next.config.js` 本身。以前推荐用 CJS 格式，但现在 Next.js 也支持 `next.config.mjs`。如果你的项目是 `"type": "module"`，直接用 `.mjs` 后缀可以避免很多麻烦。

### Q7: `package.json` 的 `type` 字段真的还重要吗？我都用 TS 了。
**A: 非常重要！它是宪法。** （回到Q1）
TypeScript 只是“翻译官”。翻译完的代码（`.js`）要交给 Node.js（皇帝）去执行。Node.js **不看** `tsconfig.json`，它只看 `package.json` 的 `type` 和文件后缀来决定怎么解释这段代码。如果翻译官（TS）输出的是 ESM，但皇帝（Node）以为是 CJS，就会斩立决（报错）。

### Q8: `tsconfig.preload.json` 里为什么写 `"module": "CommonJS"`？
**A: 为了保命（兼容性）。**
Preload 脚本运行在一个特殊的“魔法环境”里：既能访问 Node API，又在浏览器上下文。虽然 Electron *可以* 支持 ESM Preload，但配置极其繁琐（需要沙箱配置配合）。将其编译为 CommonJS 并通过 `contextBridge` 暴露接口，是目前最稳定、最少坑的解法。

### Q9: `/// <reference types="vite/client" />` 是什么符咒？
**A: 这是给 TypeScript 的“作弊条”。**
`import.meta.env` 本质上是 Vite 注入的一个魔法对象，原生 TS 定义里根本没有这玩意。
这句话告诉 TS：“去加载 Vite 客户端的类型定义”，于是 `import.meta` 上就多了 `env` 属性，报错消失。

### Q10: 根目录和子目录 `package.json` 的关系？以及“本地可跑，上线挂掉”的惨案？
**A: 级联覆盖，但依赖管理是深坑。**
*   **配置覆盖**：Node.js 查找 `package.json` 是向上递归的。如果 `apps/desktop/package.json` 定义了 `"type": "module"`，那么该目录下的 JS 文件就是 ESM，它**覆盖**了根目录可能的 `"type": "commonjs"` 设置。如果不定义，就会继承上层（或默认）。
*   **线上事故高发区 (Monorepo)**：
    本地开发时，包管理器（pnpm/yarn）通常把依赖提升（hoist）到了根目录的 `node_modules`。你的 `apps/hub` 代码可以直接引用根目录的包，开发一切正常。
    **但是！** 当如果你上线打包 Docker 镜像时，只复制了 `apps/hub` 目录和它的 `package.json`，而忘记了那些“幽灵依赖”其实在根目录。
    **最佳实践**：
    1.  **Docker 构建**：使用 Monorepo 专用的构建策略（如 Turborepo 的 `prune` 命令），确保把所有依赖关系完整的复制进去。
    2.  **Explicit Dependencies**：确保 `apps/hub/package.json` 里显式声明了它用到的所有包，不要依赖“根目录正好有”的巧合。

### Q11: `vite.config.ts` 和 `tsconfig.json` 谁说了算？
**A: 各管一段，偶尔打架。**
*   **TSConfig**：管**类型检查**（IDE 报错红线）和 `tsc` 编译。
*   **ViteConfig**：管**打包构建**。Vite 内部其实用 esbuild 转译，经常**无视** `tsconfig` 的编译选项（比如 `target`），但会尊重 `paths` 别名。
*   **Next.js Config**: Next.js 比较特殊，它的 Webpack/TurboPack 构建黑盒会覆盖 `tsconfig` 的很多选项。最新版 Next.js 已经很好地支持了 ESM 配置。
*   **最佳实践**：保持两者逻辑一致，别让 TS 以为在A，Vite 却打包到B。

### Q12: `tsc` 怎么知道对哪个项目使用哪个 config 文件？
**A: 显式指定或引用链。**
1.  **显式指定**：在 `package.json` 的 scripts 里写 `tsc -p tsconfig.node.json`。
2.  **References（推荐）**：根目录如果不放源码，通常放一个“聚合” `tsconfig.json`，里面用 `"references": [{ "path": "./tsconfig.web.json" }, ...]` 来指引编译器。VS Code 也会通过这个入口找到正确的子配置。

### Q13: `module` 字段除了 `ESNext` 还有啥？
**A: 决定了“输出什么样的代码”。**
	**   **`CommonJS`**: 输出 `require()`。如果要跑在老 Node 或未配置 ESM 的环境，选它。比如 Electron 项目的 preload。
*   **`ESNext`**: 输出 `import()`。保留现代语法，交给 Vite/Webpack 去打包，或直接给现代浏览器/Node (v12+) 吃。
*   **`NodeNext`** (强烈推荐给 Node 项目): 聪明模式。它会根据文件后缀 (`.mts` vs `.cts`) 和 `package.json` 的 type 自动决定输出 ESM 还是 CJS。

----

模块化标准不一致很讨厌。但随着 Node.js 对 ESM 支持的成熟以及 TypeScript `moduleResolution: bundler` 的普及，迷雾正在散去！大原则：**明确代码在哪里运行（Browser vs Node），明确配置是谁在由谁消费（Vite vs tsc vs Runtime）**，我们就能在 `import` 和 `require` 之间游刃有余。

愿我们的浏览器控制台永不出现红色代码，阿门！