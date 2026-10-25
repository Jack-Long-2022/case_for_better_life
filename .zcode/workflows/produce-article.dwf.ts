/* zcode-workflow
description: 例会第二阶段：对拍板选中的案例卡做提炼与成稿，产出母本六段成稿与 3 个标题候选，待老总终审。
whenToUse: weekly-review 产出候选、老总拍板后运行。casePath 参数传选中的案例卡路径。
args:
  casePath:
    type: string
    description: 拍板选中的案例卡路径，如 cases/2026-10-25-xxx.md
    required: true
*/
interface InsightInfo {
  /** insights/ 文件路径 */
  path: string;
  /** 原则的一句话表述 */
  principle: string;
}

interface DraftInfo {
  /** 成稿路径，如 articles/2026-10-25-xxx.md */
  path: string;
  /** 3 个标题候选：利益直给型、场景共鸣型、反常识型 */
  titles: string[];
  /** 文中使用的证据等级标签 */
  evidence: string;
}

const casePath = String(args.casePath);

const distiller = agent("提炼师", {
  system:
    "你是一人公司「案例知识库与内容工厂」的提炼师，负责实践论中「感性认识→理性认识」的一跳。开工前先读 README.md 与 CONTEXT.md。" +
    "每条可复用原则必须挂具体案例来源，明确写出适用边界与反例；案例里没有的规律不提炼。输出按 templates/洞察模板.md 写入 insights/，更新已有的 insight 优于新建。",
});

phase("提炼案例中的可复用原则");
const insights = await distiller.ask<{ insights: InsightInfo[] }>(
  `读案例卡 ${casePath} 与其中「关联洞察」指向的既有洞察，提炼或更新可复用原则，写入 insights/，并回填案例卡的关联洞察字段与状态。返回本轮涉及的原则清单。`,
);
log(`涉及原则 ${insights.insights.length} 条`);

phase("撰写母本成稿与标题候选");
const writer = agent("写手", {
  system:
    "你是一人公司「案例知识库与内容工厂」的写手。开工前先读 README.md（文风：混合体）与 templates/母本模板.md。" +
    "文风纪律：前半段讲人话讲故事（感性认识），后半段给可照做的清单（理性认识）；口语、具体、有数字；禁用空话套话。" +
    "证据等级标签必须原样出现在文中；适用边界必须诚实；不夸大结果。案例信息不足以成稿时，列明缺口上报，不硬写。",
});
const draft = await writer.ask<DraftInfo>(
  `基于案例卡 ${casePath} 与下列原则：${JSON.stringify(insights.insights)}，按母本六段式模板写成稿到 articles/（文件名：日期-短标题.md），frontmatter 完整，并把案例卡状态推进到「可发布」。给 3 个标题候选：利益直给型、场景共鸣型、反常识型。返回成稿信息。`,
);

await artifact.file("draft", draft.path, {
  title: "母本成稿（待老总终审）",
  description: "六段式母本成稿与 3 个标题候选，终审通过后手动发布。",
  primary: true,
});

return {
  conclusion: `成稿已就绪：${draft.path}。标题候选：${draft.titles.join("；")}。请老总终稿过目并选定标题；当前为手动发布阶段：doocs/md 渲染后粘贴知识星球与公众号。`,
  findings: [
    {
      where: draft.path,
      what: "母本成稿与标题候选，待老总终审",
      evidence: `证据等级：${draft.evidence}；标题候选：${draft.titles.join("；")}`,
      status: "unconfirmed" as const,
      severity: "medium" as const,
    },
  ],
  verified: [],
  notCovered: ["终稿过目、标题拍板、发布与反馈回流由老总手动完成（发布自动化在第二阶段接入 zsxq-skill）"],
};
