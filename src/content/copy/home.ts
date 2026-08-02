/**
 * Home 文案编辑说明：木下通常只需修改下方的字符串值，不要改动字段名、对象结构或 TODO 注释。
 * TODO 注释对应当前的原型、占位或只验证文案；确认最终内容后，再只替换对应字符串。
 */

export const homePlanetKeys = [
  "about",
  "feed",
  "blog",
  "projects",
  "learn",
] as const;

export type HomePlanetKey = (typeof homePlanetKeys)[number];

type HomePlanetCopy = {
  label: string;
  subtitle: string;
  focus: {
    kicker: string;
    title: string;
    description: string;
    notes: readonly string[];
    action: string;
  };
};

type HomeCopy = {
  entry: {
    eyebrow: string;
    title: string;
    description: string;
    action: string;
  };
  stage: {
    initial: { name: string; description: string };
    entry: { name: string; description: string };
    approach: { name: string; description: string };
    overview: { name: string; description: string };
    focus: { namePrefix: string; nameSuffix: string; description: string };
  };
  planets: Record<HomePlanetKey, HomePlanetCopy>;
  focus: { placeholderKicker: string; backAction: string };
  cat: { hint: string; chargedHint: string };
  footer: string;
  contact: {
    ariaLabel: string;
    label: string;
    xiaohongshu: { ariaLabel: string; href: string };
    email: { ariaLabel: string; address: string };
  };
  flightIndex: {
    ariaLabel: string;
    entry: string;
    overview: string;
  };
  accessibility: {
    journeyLabel: string;
    mapLabel: string;
    catZoneLabel: string;
    focusLabel: string;
  };
  activityStatus: {
    active: string;
    stable: string;
    dormant: string;
    unavailable: string;
  };
};

export const homeCopy = {
  entry: {
    eyebrow: "catstarry.xyz",
    title: "木下的星群漫游",
    description: "从这里进入独立生长的空间。",
    action: "DISCOVER MORE",
  },
  stage: {
    initial: {
      name: "00 / ENTRY",
      description: "far field · distance before destination",
    },
    entry: {
      name: "00 / ENTRY",
      description: "five distant targets · one living starfield",
    },
    approach: {
      name: "01 / APPROACH",
      description: "target stars become small worlds in place",
    },
    overview: {
      name: "02 / STAR MAP",
      description: "five stable regions · full warm geologies",
    },
    focus: {
      namePrefix: "03 /",
      nameSuffix: "FOCUS",
      description: "content first · planet as spatial window",
    },
  },
  planets: {
    about: {
      label: "ABOUT",
      subtitle: "personal orbit",
      // TODO(木下替换)：当前为私人世界与镜头占位说明，保留原型文案直到最终内容确认。
      focus: {
        kicker: "PERSONAL ORBIT",
        title: "木下",
        description:
          "个人世界的轨道与镜头，记录成长、选择，以及那些值得长期留下的事。",
        notes: [
          "天下断无易处之境遇 人生哪得空闲之光阴",
          "怕什么真理无穷 进一步有进一步的欢喜",
        ],
        action: "",
      },
    },
    feed: {
      label: "FEED",
      subtitle: "public footprints",
      // TODO(木下替换)：当前含“只验证/原型”临时说明；不要在本次维护中自行创作最终文案。
      focus: {
        kicker: "PUBLIC FOOTPRINTS",
        title: "FEED",
        description: "短暂的想法、路过的事物与时间留下痕迹。",
        notes: [
          "碎碎念与剪藏构成此刻。",
          "写作、学习与项目的里程碑汇入同一条来时路。",
        ],
        action: "ENTER FEED",
      },
    },
    blog: {
      label: "BLOG",
      subtitle: "writing & notes",
      // TODO(木下替换)：当前含“可替换占位/原型”临时说明；不要在本次维护中自行创作最终文案。
      focus: {
        kicker: "WRITING & NOTES",
        title: "BLOG",
        description:
          "把尚未想清的问题写深一些，也把值得保留的认识整理成可以重读的文字。",
        notes: ["长文承载相对完整的思考。", "笔记保存形成的判断与线索。"],
        action: "ENTER BLOG",
      },
    },
    projects: {
      label: "PROJECTS",
      subtitle: "selected builds",
      // TODO(木下替换)：当前含“原型”临时说明；不要在本次维护中自行创作最终文案。
      focus: {
        kicker: "SELECTED BUILDS",
        title: "PROJECTS",
        description: "把想法推到可以运行、可以使用，也可以被检验的地方。",
        notes: [
          "这里留下值得持续维护的作品。",
          "过程、取舍与结果同样属于项目本身。",
        ],
        action: "ENTER PROJECTS",
      },
    },
    learn: {
      label: "LEARN",
      subtitle: "learning tracks",
      // TODO(木下替换)：当前含“只验证/原型”临时说明；不要在本次维护中自行创作最终文案。
      focus: {
        kicker: "LEARNING TRACKS",
        title: "LEARN",
        description: "沿着问题建立路径，把零散的输入变成能够继续生长的理解。",
        notes: [
          "主题、章节与笔记构成学习轨道。",
          "每一次完成，都是下一次深入的坐标。",
        ],
        action: "ENTER LEARN",
      },
    },
  },
  focus: { placeholderKicker: "PLANET FOCUS", backAction: "返回星图" },
  cat: { hint: "starry", chargedHint: "再次点击，进入木下的轨道" },
  footer: "星图在此收束。写作、建造、学习与来时路，仍会在各自的轨道上继续。",
  contact: {
    ariaLabel: "联系方式",
    label: "CONTACT ME",
    xiaohongshu: {
      ariaLabel: "在小红书打开木下的主页",
      href: "https://www.xiaohongshu.com/user/profile/65ae04a9000000000e001b82?xsec_token=YBpD59aYlhY6X6L2AxFjtCoAV05Yydo7eHVkaqOUmsRlg=&xsec_source=app_share&&apptime=1785641579&shareRedId=ODtDRTM5RUI2NzUyOTgwNjZIOTc1Rz47&share_id=f0aff52d27814d2688309f6e6128aec7&xhsshare=CopyLink",
    },
    email: { ariaLabel: "显示木下的邮箱", address: "jina@catstarry.xyz" },
  },
  flightIndex: {
    ariaLabel: "Home 航行索引",
    entry: "ENTRY",
    overview: "STAR MAP",
  },
  accessibility: {
    journeyLabel: "Home 星图",
    mapLabel: "自由分布星图",
    catZoneLabel: "豹猫卫星彩蛋",
    focusLabel: "星球特写",
  },
  activityStatus: {
    active: "活动状态：活跃",
    stable: "活动状态：稳定",
    dormant: "活动状态：休眠",
    unavailable: "活动状态：当前不可用",
  },
} as const satisfies HomeCopy;
