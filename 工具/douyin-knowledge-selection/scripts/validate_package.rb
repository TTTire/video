#!/usr/bin/env ruby
# frozen_string_literal: true

require 'pathname'

topic_dir = Pathname(ARGV.fetch(0) do
  warn 'Usage: ruby validate_package.rb <topic-directory>'
  exit 2
end).expand_path

unless topic_dir.directory?
  warn "FAIL: topic directory not found: #{topic_dir}"
  exit 2
end

script_files = topic_dir.glob('*-口播逐字稿.md').reject { |path| path.basename.to_s.include?('剪映版') }
clip_files = topic_dir.glob('*-口播逐字稿-剪映版.md')
checklist_files = topic_dir.glob('*-发布清单.md')

errors = []
errors << "expected 1 script, found #{script_files.length}" unless script_files.length == 1
errors << "expected 1 Jianying export, found #{clip_files.length}" unless clip_files.length == 1
errors << "expected 1 publish checklist, found #{checklist_files.length}" unless checklist_files.length == 1

unless errors.empty?
  errors.each { |message| warn "FAIL: #{message}" }
  exit 1
end

script = script_files.first.read(encoding: 'UTF-8')
clip = clip_files.first.read(encoding: 'UTF-8')
checklist = checklist_files.first.read(encoding: 'UTF-8')

chapter_numbers = script.scan(/^## 第([0-9]+)章：/).flatten.map(&:to_i)
errors << "chapter sequence must be 1,2,3; got #{chapter_numbers.inspect}" unless chapter_numbers == [1, 2, 3]

first_chapter_offset = script.index(/^## 第1章：/)
intro = first_chapter_offset ? script[0...first_chapter_offset] : ''
intro_body = intro.lines.reject { |line| line.strip.empty? || line.start_with?('# ') }
errors << 'independent opening is empty' if intro_body.empty?

blocks = [[]]
script.each_line do |line|
  stripped = line.strip
  next if stripped.empty? || stripped.start_with?('# ')

  if stripped.match?(/^## 第[123]章：/)
    blocks << [] unless blocks.last.empty?
    next
  end

  clean = stripped.gsub(/[\p{P}\p{S}]/, '').gsub(/[ \t]+/, ' ').strip
  blocks.last << clean unless clean.empty?
end

blocks.reject!(&:empty?)
expected_clip = blocks.map { |block| block.join("\n") }.join("\n\n") + "\n"
errors << "Jianying export must contain 4 text groups; got #{blocks.length}" unless blocks.length == 4
errors << 'Jianying export differs from normalized script' unless clip == expected_clip
errors << 'Jianying export contains punctuation or symbols' unless clip.scan(/[\p{P}\p{S}]/).empty?

required_sections = [
  '## 发布前检查',
  '## 发布设置',
  '### 推荐标题',
  '### 封面图片 Prompt',
  '### 标签',
  '### 发布文案',
  '### 发布时间',
  '### 画面方向',
  '### 背景音乐（Suno）',
  '## 发布后',
  '## 下一条视频'
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

script_title = script.lines.first.to_s.sub(/^#\s*/, '')
validate_title_length(errors, 'script title', script_title)

checklist_title = checklist.lines.first.to_s.sub(/^#\s*/, '').sub(/\s+[—-]\s+发布清单\s*$/, '')
validate_title_length(errors, 'publish checklist title', checklist_title)

recommended_titles = checklist.scan(/^\d+\. \*\*(.+?)\*\*/).flatten
recommended_titles.each_with_index do |title, index|
  validate_title_length(errors, "recommended title #{index + 1}", title)
end

cover_title = checklist[/^封面标题：[ \t]*\r?\n(?:\r?\n)*[ \t]*`?([^`\r\n]+)`?[ \t]*$/, 1]
errors << 'cover title not found for title-length validation' unless cover_title
validate_title_length(errors, 'cover title', cover_title) if cover_title

cover_fields = ['封面标题：', '备选标题：', '一句视觉方案：', 'Image2 一段式 Prompt：', 'COVER_DNA v1']
cover_fields.each do |field|
  errors << "cover prompt missing #{field}" unless checklist.include?(field)
end

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
forbidden_hits = forbidden_terms.to_h { |term| [term, script.scan(term).length] }.reject { |_term, count| count.zero? }
errors << "forbidden AI-style terms found: #{forbidden_hits}" unless forbidden_hits.empty?

han_count = script.scan(/\p{Han}/).length
spoken_han_count = blocks.flatten.join.scan(/\p{Han}/).length
declared_han_count = checklist[/(?:可口播)?正文\s*(\d+)\s*个汉字/, 1]&.to_i
if declared_han_count && declared_han_count != spoken_han_count
  errors << "publish checklist declares #{declared_han_count} spoken Han, actual #{spoken_han_count}"
end

template_counts = ['不是', '而是', '真正', '你以为', '这就是', '很多人'].to_h do |phrase|
  [phrase, script.scan(phrase).length]
end

puts "script=#{script_files.first}"
puts "han_count=#{han_count}"
puts "spoken_han_count=#{spoken_han_count}"
puts "declared_spoken_han_count=#{declared_han_count || 'not_found'}"
puts "chapters=#{chapter_numbers.join(',')}"
puts "opening_lines=#{intro_body.length}"
puts "jianying_blocks=#{blocks.length}"
puts "jianying_exact_match=#{clip == expected_clip}"
puts "template_phrase_counts=#{template_counts}"

not_density = han_count.zero? ? 0 : template_counts['不是'] * 1000.0 / han_count
warn format('WARN: 不是 density %.2f per 1000 Han; review for repetitive reversal syntax', not_density) if not_density > 6

if errors.empty?
  puts 'VALIDATION=PASS'
  exit 0
end

errors.each { |message| warn "FAIL: #{message}" }
puts 'VALIDATION=FAIL'
exit 1
