<img width="1172" height="3235" alt="image" src="https://github.com/user-attachments/assets/1a0419e0-7604-4b23-8f4a-17f8f157d21b" />
本项目基于高德SDK开发，调用JS API，致力于解决用户规划路线的“模糊化”与“多样化”个人需求，是一款智能旅游规划助手，通过自然语言理解用户意图，生成可视化的city walk路线。
在该网址可直接访问作品（无需VPN）：https://693a67f7473f52a20ed1636f--lovely-pothos-7062b3.netlify.app/（简洁版）

这里是集成了语音识别功能与优惠卷推送功能，同时支持移动端和PC端的APP下载：https://illustrious-duckanoo-ea887d.netlify.app/。

AI意图与路线规划：集成大模型支持自然语言，自动提取POI规划合理路线，使用高德JS API进行动态路径绘制与路标标记、信息窗口交互等功能（具体使用流程见上图）。
 鸿蒙原生适配说明 (HarmonyOS)

 比赛规则合规性说明：本仓库包含完整的 HarmonyOS 原生应用代码，满足“提交代码仓库中包含鸿蒙应用核心代码”之要求。

鸿蒙模块路径： `./CityWalkProject`  
运行方式： 该目录为标准 DevEco Studio 工程。使用 ArkTS Web 组件加载云端服务，直接使用 DevEco Studio 打开该目录即可编译运行。

