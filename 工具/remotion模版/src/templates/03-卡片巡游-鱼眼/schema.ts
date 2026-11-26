import {z} from 'zod';

const row = z.object({
  name: z.string().describe('名字'),
  value: z.string().describe('右边的数，正负号和货币符号照写'),
  note: z.string().optional().describe('名字下面的一行小字：横条卡上是 Total received，清单卡上是类别。不写就没有'),
  bar: z.number().min(0).max(1).optional().describe('横条卡：这一行的条占满格的多少（0 到 1）。不写就没有条'),
  tone: z.enum(['plain', 'pos', 'neg']).optional().describe('清单卡：数字的颜色。plain 深色（默认）、pos 绿、neg 红'),
  icon: z.string().max(2).optional().describe('清单卡：行首小圆圈里的图标，一两个字符'),
  tint: z.string().optional().describe('清单卡：小圆圈的底色'),
  iconColor: z.string().optional().describe('清单卡：小圆圈里图标的颜色'),
});
const list = z.object({
  heading: z.string().describe('卡片的标题'),
  viewAll: z.string().describe('标题右边那行灰色小字'),
  rows: z.array(row).describe('从上到下每一行'),
});
const three = z.tuple([z.string(), z.string(), z.string()]);

export const schema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）'),
  stations: z
    .array(
      z.object({
        title: z.string().describe('这一站的标题。空格分开的词一个接一个弹出；要换行就写 \\n'),
        at: z.number().describe('这一站的主角落定、标题开始弹出的帧'),
        until: z.number().optional().describe('这一站开始离开的帧。第四站不用填，它会一直停到结束'),
      })
    )
    .length(4)
    .describe('四站。前三站的主角落在一起定死：横条卡、发票卡、清单卡；第四站是总览，五张卡片都在'),
  introTravel: z.number().min(12).describe('开场总览停多久，也就是从第一帧到镜头开始飞向第一张主角卡的帧数'),
  cards: z.object({
    bars: list.describe('第一站的主角：每一行有一根条'),
    invoice: z
      .object({
        company: z.string().describe('左上角的机构名'),
        docLabel: z.string().describe('右上角的大字'),
        meta: z.string().describe('大字下面的单号'),
        status: z.string().describe('单号后面的状态，橙色'),
        billLabel: z.string().describe('买方那一栏的小标题，默认 Bill to'),
        fromLabel: z.string().describe('卖方那一栏的小标题，默认 From'),
        billTo: three.describe('买方：名字、地址、邮箱'),
        from: three.describe('卖方：名字、地址、邮箱'),
        issueDate: z.string().describe('开票日期'),
        dueDate: z.string().describe('到期日期'),
        cols: z.tuple([z.string(), z.string(), z.string(), z.string()]).describe('明细表四列的表头'),
        item: z.object({desc: z.string(), qty: z.string(), rate: z.string(), amount: z.string()}).describe('明细表那一行'),
        subtotalLabel: z.string().describe('小计那行的名字，默认 Subtotal'),
        subtotal: z.string().describe('小计'),
        taxLabel: z.string().describe('税那行的名字，如 Tax (0%)'),
        tax: z.string().describe('税额'),
        totalLabel: z.string().describe('合计那行的名字，默认 Total'),
        total: z.string().describe('合计'),
      })
      .describe('第二站的主角'),
    transactions: list.describe('第三站的主角：行首有小圆圈，数字可以带颜色'),
    donut: z
      .object({
        heading: z.string().describe('标题'),
        center: z.string().describe('环中间的数'),
        centerLabel: z.string().describe('数下面的小字'),
        legend: z
          .array(z.object({name: z.string().describe('名字'), value: z.string().describe('数'), color: z.string().describe('颜色'), share: z.number().min(0).max(1).describe('占整圈的多少（0 到 1）')}))
          .describe('从正上方起顺时针排'),
      })
      .describe('环形图卡，只在总览里和第二、三站的角上出现'),
    expense: z
      .object({
        heading: z.string().describe('标题，灰色大写'),
        button: z.string().describe('蓝色按钮上的字'),
        buttonColor: z.string().describe('按钮的颜色'),
        label: z.string().describe('按钮下面那行小字'),
      })
      .describe('带一个蓝色按钮的小卡，大部分时候只露一条边'),
  }),
  lens: z.number().min(0).max(700).describe('镜头弯得多厉害：画面最远的那一角往里拉多少像素。0 就没有镜头'),
  accent: z.string().describe('横条卡上条的颜色'),
  titleColor: z.string().describe('标题的颜色'),
  fontSize: z.number().describe('标题的字号（像素）'),
  motionBlur: z.boolean().describe('卡片飞得快时带不带动态模糊。带上更顺，出片要慢两三倍。先调内容时可以关掉'),
});

export type TemplateProps = z.infer<typeof schema>;

// 默认内容是参考视频的原样（一套记账软件的界面卡片），只为逐帧对照，里面的名字和钱数都没有核实过。
// 各个帧号是从参考（60fps、6 秒）逐帧量出来再除以 2 的。
export const defaultProps: TemplateProps = {
  durationInFrames: 180,
  stations: [
    {title: 'Track Income', at: 33, until: 56},
    {title: 'Manage Invoices', at: 71, until: 90},
    {title: 'Organize Transactions', at: 107, until: 123},
    {title: 'Understand\nBusiness', at: 137},
  ],
  introTravel: 18,
  cards: {
    bars: {
      heading: 'Top Income Sources',
      viewAll: 'View All ›',
      rows: [
        {name: 'Acme Corp', value: '+$50,268', note: 'Total received', bar: 1},
        {name: 'Gamma LLC', value: '+$41,631', note: 'Total received', bar: 0.83},
        {name: 'Beta Studio', value: '+$34,572', note: 'Total received', bar: 0.69},
      ],
    },
    invoice: {
      company: 'Riviera Creative',
      docLabel: 'INVOICE',
      meta: 'INV-2025-001',
      status: 'Pending',
      billLabel: 'Bill to',
      fromLabel: 'From',
      billTo: ['Acme Corp', 'New York, NY', 'contact@acme.com'],
      from: ['Alex Rivera', 'San Francisco, CA', 'alex@riviera.co'],
      issueDate: '2025-06-01',
      dueDate: '2025-06-30',
      cols: ['Description', 'Qty', 'Rate', 'Amount'],
      item: {desc: 'Brand identity design', qty: '1', rate: '$3,500', amount: '$3,500'},
      subtotalLabel: 'Subtotal',
      subtotal: '$3,500',
      taxLabel: 'Tax (0%)',
      tax: '$0',
      totalLabel: 'Total',
      total: '$3,500',
    },
    transactions: {
      heading: 'Recent Transactions',
      viewAll: 'View All ›',
      rows: [
        {name: 'Gamma LLC', value: '+$4,249', note: 'Technology', icon: '◎'},
        {name: 'Tools', value: '-$143', note: 'Subscriptions', icon: '◇', tone: 'neg'},
        {name: 'Beta Studio', value: '+$1,956', note: 'Freelancing', icon: '▣'},
        {name: 'Marketing', value: '-$381', note: 'Advertising', icon: '✳', tone: 'neg', tint: '#fbe9ef', iconColor: '#c6366f'},
        {name: 'Acme Corp', value: '+$4,757', note: 'Consulting', icon: '⊙'},
      ],
    },
    donut: {
      heading: 'Expense Breakdown',
      center: '$13,271',
      centerLabel: 'Total spent',
      legend: [
        {name: 'Marketing', value: '$4,920', color: '#f6a723', share: 4920 / 13271},
        {name: 'Tools', value: '$4,983', color: '#a8d62a', share: 4983 / 13271},
        {name: 'Software', value: '$3,368', color: '#3d6bf5', share: 3368 / 13271},
      ],
    },
    expense: {heading: 'EXPENSE TRACKER', button: 'Add expense', buttonColor: '#3d6bf5', label: 'Software 60%'},
  },
  lens: 420,
  accent: '#93d533',
  titleColor: '#d9fb86',
  fontSize: 104,
  motionBlur: true,
};
