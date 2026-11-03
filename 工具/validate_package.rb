#!/usr/bin/env ruby
# frozen_string_literal: true

require 'pathname'

# 用法：ruby 工具/validate_package.rb <选题文件夹>
# 检查讲稿卡 + 发布清单（2026-11 起不写口播逐字稿和剪映版）。
# 分场景表的起始要点逐条核对交给 工具/video-render/scripts/scenes_from_checklist.py，这里只查列名。

topic_dir = Pathname(ARGV.fetch(0) do
  warn 'Usage: ruby 工具/validate_package.rb <topic-directory>'
  exit 2
end).expand_path

unless topic_dir.directory?
  warn "FAIL: topic directory not found: #{topic_dir}"
  exit 2
end

card_files = topic_dir.glob('*-讲稿卡.md')
checklist_files = topic_dir.glob('*-发布清单.md')

errors = []
errors << "expected 1 讲稿卡, found #{card_files.length}" unless card_files.length == 1
errors << "expected 1 publish checklist, found #{checklist_files.length}" unless checklist_files.length == 1

unless errors.empty?
  errors.each { |message| warn "FAIL: #{message}" }
  exit 1
end

card = card_files.first.read(encoding: 'UTF-8')
checklist = checklist_files.first.read(encoding: 'UTF-8')

# 讲稿卡：## 开头 → ## 第 1 章 → ## 第 2 章 → ## 第 3 章，每段下面顶格的 `1.` / `-` 是一条要点（规则同 video-render/scripts/card.py）
# 禁用词、句式只查这几段要讲的内容（「## 别说」里本来就列着禁用词）
sections = [] # [[段名, 要点数]]
current = nil
spoken = +''
point_han_count = 0
card.each_line do |line|
  if line.start_with?('## ')
    current = nil
    if line.match?(/\A##\s*开头/)
      current = ['开头', 0]
    elsif (m = line.match(/\A##\s*第\s*(\d+)\s*章/))
      current = ["第#{m[1]}章", 0]
    end
    sections << current if current
  elsif current
    spoken << line
    next unless line.match?(/\A(?:\d+[.、]|[-*])\s+\S/)

    current[1] += 1
    point_han_count += line.scan(/\p{Han}/).length
  end
end
section_names = sections.map(&:first)
errors << "讲稿卡的段落要依次是 开头、第1章、第2章、第3章；现在是 #{section_names.inspect}" unless section_names == %w[开头 第1章 第2章 第3章]
sections.each do |name, count|
  range = name == '开头' ? (4..7) : (4..10)
  errors << "讲稿卡「#{name}」没有要点（顶格写 `1.` 或 `-`）" if count.zero?
  warn "WARN: 讲稿卡「#{name}」有 #{count} 条要点，一般 #{range.min}–#{range.max} 条" if count.positive? && !range.cover?(count)
end
['**一句话反转**', '## 数字表', '## 别说', '## 录制'].each do |part|
  errors << "讲稿卡缺少 #{part}" unless card.include?(part)
end

scene_header = checklist[/^\|\s*#\s*\|\s*场景 id\s*\|.*$/]
if scene_header.nil?
  errors << 'publish checklist missing 分场景表（列：# | 场景 id | 起始要点 | 这段在讲什么 | 图 | 叠字 | 环境声）'
elsif !scene_header.include?('起始要点')
  errors << '分场景表第 3 列要是「起始要点」，填讲稿卡的要点 id（0.1、1.0、2.3）；口播稿行号的「起始句」已停用'
end

required_sections = [
  '## 推荐标题',
  '## 封面图片 Prompt',
  '## 标签',
  '## 发布文案',
  '## 发布时间',
  '## 背景音乐（Suno）',
  '## 画面与素材清单',
  '## 事实核对'
]
required_sections.each do |heading|
  errors << "publish checklist missing #{heading}" unless checklist.include?(heading)
end

errors << 'publish checklist must contain exactly 3 numbered recommended titles' unless checklist.scan(/^\d+\. \*\*/).length == 3

def han_count(text)
  text.scan(/\p{Han}/).length
end

def validate_title_length(errors, label, title)
  count = han_count(title)
  errors << "#{label} Chinese visible title has #{count} Han characters; maximum is 13" if count > 13
end

card_title = card.lines.first.to_s.sub(/^#\s*/, '').sub(/\s*[—–-]+\s*讲稿卡\s*\z/, '')
validate_title_length(errors, '讲稿卡 title', card_title)

checklist_title = checklist.lines.first.to_s.sub(/^#\s*/, '').sub(/\s+[—-]\s+发布清单\s*$/, '')
validate_title_length(errors, 'publish checklist title', checklist_title)

recommended_titles = checklist.scan(/^\d+\. \*\*(.+?)\*\*/).flatten
recommended_titles.each_with_index do |title, index|
  validate_title_length(errors, "recommended title #{index + 1}", title)
end

cover_title = checklist[/^封面标题：[ \t]*\r?\n(?:\r?\n)*[ \t]*`?([^`\r\n]+)`?[ \t]*$/, 1]
errors << 'cover title not found for title-length validation' unless cover_title
validate_title_length(errors, 'cover title', cover_title) if cover_title

cover_fields = ['封面标题：', '备选标题：', '一句视觉方案：']
cover_fields.each do |field|
  errors << "cover prompt missing #{field}" unless checklist.include?(field)
end
errors << 'cover prompt missing Image2 一段式 Prompt：' unless checklist.match?(/Image2(?: \/ Image2\.5)? 一段式 Prompt：/)
errors << 'cover prompt missing COVER_DNA (v1 or v2)' unless checklist.match?(/COVER_DNA v[12]/)

suno_limits = [
  'strictly instrumental only',
  'no vocals',
  'no vocal chops',
  'no humming',
  'no choir',
  'no spoken word',
  'no whispers',
  'no ad-libs',
  'no vocal samples'
]
suno_limits.each do |limit|
  errors << "Suno prompt missing #{limit}" unless checklist.include?(limit)
end

forbidden_terms = %w[深度赋能 认知升级 底层逻辑 显著提升 闭环 抓手 高维度 本质上 不难发现 值得注意的是 在这个时代]
forbidden_hits = forbidden_terms.to_h { |term| [term, spoken.scan(term).length] }.reject { |_term, count| count.zero? }
errors << "forbidden AI-style terms found: #{forbidden_hits}" unless forbidden_hits.empty?

template_counts = ['不是', '而是', '真正', '你以为', '这就是', '很多人'].to_h do |phrase|
  [phrase, spoken.scan(phrase).length]
end

puts "card=#{card_files.first}"
puts "points=#{sections.map { |name, count| "#{name} #{count}" }.join(', ')}"
puts "point_han_count=#{point_han_count}"
puts format('estimated_minutes=%.1f（卡上约 200 字/分，AI03 实录）', point_han_count / 200.0)
puts "template_phrase_counts=#{template_counts}"

# “不是”是正常口语词，只在“不是……而是……”成串出现时才提醒
not_but = spoken.scan(/不是[^。\n]{0,20}而是/).length
warn format('WARN: 「不是…而是」出现 %d 次; 检查是否重复使用同一反转句式', not_but) if not_but > 3

if errors.empty?
  puts 'VALIDATION=PASS'
  exit 0
end

errors.each { |message| warn "FAIL: #{message}" }
puts 'VALIDATION=FAIL'
exit 1
