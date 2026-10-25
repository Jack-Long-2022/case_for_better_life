/* zcode-workflow
description: 周日例会·选题会：清理 inbox、生成案例卡、产出通过使命三问的选题候选清单，交老总拍板。
whenToUse: 每周日晚例会第一步；或 inbox 攒了素材想看选题候选时随时运行。跑完由老总拍板选题，再以 casePath 参数运行 produce-article。
*/
interface CaseCardInfo {
  /** 案例卡路径，如 cases/2026-10-25-xxx.md */
  path: string;
  /** 一句话标题 */
  title: string;
  /** 亲历案例 或 转述案例 */
  type: string;
  /** 亲历验证 | 他人案例·已核实 | 他人案例·仅引用 | 待定 */
  evidence: string;
}

interface Candidate {
  /** 选题标题 */
  title: string;
  /** 对应案例卡路径 */
  casePath: string;
  /** 使命三问·解问：谁、正被什么困住 */
  problem: string;
  /** 使命三问·可信：证据等级与标注情况 */
  evidence: string;
  /** 使命三问·可用：能否照做、边界是否清楚 */
  usable: string;
  /** 一句话：本周为什么值得写它 */
  why: string;
}

const editor = agent("采编", {
  system:
    "你是一人公司「案例知识库与内容工厂」的采编，向老总汇报。开工前先读 README.md（公司章程：使命、使命三问、反使命）与 CONTEXT.md（术语表），严格遵守。" +
    "生成案例卡前先读 templates/案例卡模板.md。引用达不到最低标准（渠道+日期+可识别来源）的素材标注「待补引用」，不得进入选题候选。" +
    "若任务无法完成或指令冲突，直接说明并上报，不编造。",
});

phase("清理收件箱并生成案例卡");
const cards = await editor.ask<{ cards: CaseCardInfo[] }>(
  "清理 inbox/ 的全部素材：判断亲历案例还是转述案例，按模板生成或更新案例卡到 cases/（文件名：日期-短标识.md）。" +
    "同时盘点 cases/ 中已提炼未发布的存量案例卡。返回本轮处理的案例卡清单；inbox 为空时返回空数组并只报存量。",
);
log(`本轮案例卡 ${cards.cards.length} 张`);

phase("产出通过使命三问的选题候选");
const candidates = await editor.ask<{ candidates: Candidate[] }>(
  `基于本轮案例卡与存量案例卡，产出本周选题候选 1~3 条，每条附使命三问的完整答案；三问任何一问含糊的不得进入候选，并说明它缺什么。案例卡清单：${JSON.stringify(cards.cards)}`,
);
log(`选题候选 ${candidates.candidates.length} 条，交老总拍板`);

await artifact.markdown(
  "candidates",
  [
    "# 本周选题候选",
    "",
    "三问全过才进入本清单。请老总拍板一条，随后运行 produce-article 工作流出稿。",
    "",
    ...candidates.candidates.map(
      (c, i) =>
        `## ${i + 1}. ${c.title}\n\n- 案例卡：${c.casePath}\n- 解问：${c.problem}\n- 可信：${c.evidence}\n- 可用：${c.usable}\n- 理由：${c.why}\n`,
    ),
  ].join("\n"),
  {
    title: "本周选题候选",
    description: "采编产出的候选清单，每条附使命三问答案，待老总拍板。",
    primary: true,
  },
);

return {
  conclusion: `本轮处理案例卡 ${cards.cards.length} 张，产出选题候选 ${candidates.candidates.length} 条。请老总从清单中拍板一条，然后以 casePath 参数运行 produce-article 工作流出稿。`,
  findings: candidates.candidates.map((c) => ({
    where: c.casePath,
    what: `${c.title}——${c.why}`,
    evidence: `解问：${c.problem}；可信：${c.evidence}；可用：${c.usable}`,
    status: "unconfirmed" as const,
    severity: "medium" as const,
  })),
  verified: ["每条候选的使命三问答案由采编逐条填写并记录在候选清单"],
  notCovered: ["选题最终取舍（老总拍板）与成稿（produce-article 工作流）不在本流程内"],
};
