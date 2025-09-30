package com.herpoem.site.service.impl;

import com.herpoem.site.mapper.PostChapterMapper;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.entity.PostChapter;
import com.herpoem.site.model.vo.PageContentVO;
import com.herpoem.site.service.ContentPaginationService;
import com.herpoem.site.service.PostService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 内容分页服务实现类
 * 提供智能分页功能，确保句子完整性和内容准确性
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentPaginationServiceImpl implements ContentPaginationService {
    
    private final PostService postService;
    private final PostChapterMapper postChapterMapper;
    
    // 句子结束符的正则表达式
    private static final Pattern SENTENCE_END_PATTERN = Pattern.compile("([。！？]+[\\u201c\\u201d\\u2018\\u2019]?[\\s]*)");
    
    @Override
    public List<PageContentVO> paginateContent(String content, String title, int wordsPerPage) {
        if (!StringUtils.hasText(content)) {
            return new ArrayList<>();
        }
        
        log.debug("开始分页内容: title={}, contentLength={}, wordsPerPage={}", title, content.length(), wordsPerPage);
        
        // 对于HTML内容，使用简化分页策略，保持原有格式
        if (content.contains("<")) {
            return paginateHtmlContentSimple(content, title, wordsPerPage, null, "article");
        }
        
        // 对于纯文本内容，使用原有逻辑
        String textContent = extractTextContent(content);
        
        // 如果内容很短，直接返回一页
        if (textContent.length() <= wordsPerPage) {
            PageContentVO page = new PageContentVO(content, title, 1);
            return Arrays.asList(page);
        }
        
        // 按段落分割
        List<String> paragraphs = splitIntoParagraphs(textContent);
        
        // 按句子进一步分割
        List<SentenceInfo> sentences = extractSentences(paragraphs);
        
        // 智能分页
        return createPages(sentences, content, title, wordsPerPage, null, "article");
    }
    
    @Override
    public List<PageContentVO> paginateChapterContent(String content, String title, Long chapterId, String backgroundText, int wordsPerPage) {
        if (!StringUtils.hasText(content) && !StringUtils.hasText(backgroundText)) {
            return new ArrayList<>();
        }
        
        log.debug("开始分页章节内容: title={}, chapterId={}, contentLength={}, wordsPerPage={}", 
                title, chapterId, (content != null ? content.length() : 0), wordsPerPage);
        
        // 组合背景说明和正文内容
        String combinedContent = buildChapterContent(backgroundText, content);
        
        // 对于HTML内容，使用简化分页策略，保持原有格式
        if (combinedContent.contains("<")) {
            return paginateHtmlContentSimple(combinedContent, title, wordsPerPage, chapterId, "chapter");
        }
        
        // 对于纯文本内容，使用原有逻辑
        String textContent = extractTextContent(combinedContent);
        
        // 如果内容很短，直接返回一页
        if (textContent.length() <= wordsPerPage) {
            PageContentVO page = new PageContentVO(combinedContent, title, chapterId, 1, "chapter");
            return Arrays.asList(page);
        }
        
        // 按段落分割
        List<String> paragraphs = splitIntoParagraphs(textContent);
        
        // 按句子进一步分割
        List<SentenceInfo> sentences = extractSentences(paragraphs);
        
        // 智能分页
        return createPages(sentences, combinedContent, title, wordsPerPage, chapterId, "chapter");
    }
    
    @Override
    public List<PageContentVO> getPostPaginatedContent(Long postId, int wordsPerPage) {
        try {
            Post post = postService.getById(postId);
            if (post == null) {
                log.warn("文章不存在: postId={}", postId);
                return new ArrayList<>();
            }
            
            List<PageContentVO> allPages = new ArrayList<>();
            
            if (post.getHasChapters()) {
                // 处理有章节的文章
                
                // 添加引言页面
                if (StringUtils.hasText(post.getPreChapterContent())) {
                    String styledPreface = buildPrefaceContent(post.getPreChapterContent());
                    List<PageContentVO> prefacePages = paginateContent(styledPreface, "引言", wordsPerPage);
                    prefacePages.forEach(page -> page.setContentType("preface"));
                    allPages.addAll(prefacePages);
                }
                
                // 添加章节页面
                List<PostChapter> chapters = postChapterMapper.selectChaptersByPostId(postId);
                if (chapters != null) {
                    for (PostChapter chapter : chapters) {
                        List<PageContentVO> chapterPages = paginateChapterContent(
                            chapter.getContentHtml(), 
                            chapter.getTitle(), 
                            chapter.getId(),
                            chapter.getBackgroundText(),
                            wordsPerPage
                        );
                        allPages.addAll(chapterPages);
                    }
                }
                
            } else {
                // 处理普通文章
                String content = post.getContentHtml();
                if (!content.contains("<")) {
                    content = content.replace("\n", "<br>");
                }
                List<PageContentVO> regularPages = paginateContent(content, post.getTitle(), wordsPerPage);
                allPages.addAll(regularPages);
            }
            
            // 重新编号页码
            renumberPages(allPages);
            
            log.info("文章分页完成: postId={}, totalPages={}", postId, allPages.size());
            return allPages;
            
        } catch (Exception e) {
            log.error("获取文章分页内容失败: postId={}", postId, e);
            return new ArrayList<>();
        }
    }
    
    /**
     * 提取纯文本内容
     */
    private String extractTextContent(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }
        
        if (content.contains("<")) {
            // 移除HTML标签
            return content.replaceAll("<[^>]*>", "").trim();
        }
        
        return content.trim();
    }
    
    /**
     * 按段落分割内容
     */
    private List<String> splitIntoParagraphs(String textContent) {
        String[] paragraphArray = textContent.split("\\n\\s*\\n");
        List<String> paragraphs = new ArrayList<>();
        
        for (String paragraph : paragraphArray) {
            String trimmed = paragraph.trim();
            if (!trimmed.isEmpty()) {
                paragraphs.add(trimmed);
            }
        }
        
        return paragraphs;
    }
    
    /**
     * 从段落中提取句子信息
     */
    private List<SentenceInfo> extractSentences(List<String> paragraphs) {
        List<SentenceInfo> sentences = new ArrayList<>();
        
        for (int paragraphIndex = 0; paragraphIndex < paragraphs.size(); paragraphIndex++) {
            String paragraph = paragraphs.get(paragraphIndex);
            List<String> paragraphSentences = splitIntoSentences(paragraph);
            
            for (int sentenceIndex = 0; sentenceIndex < paragraphSentences.size(); sentenceIndex++) {
                String sentence = paragraphSentences.get(sentenceIndex);
                boolean isLastInParagraph = sentenceIndex == paragraphSentences.size() - 1;
                
                sentences.add(new SentenceInfo(sentence, paragraphIndex, isLastInParagraph));
            }
        }
        
        return sentences;
    }
    
    /**
     * 将段落分割为句子
     */
    private List<String> splitIntoSentences(String paragraph) {
        List<String> sentences = new ArrayList<>();
        Matcher matcher = SENTENCE_END_PATTERN.matcher(paragraph);
        
        int lastEnd = 0;
        while (matcher.find()) {
            int end = matcher.end();
            String sentence = paragraph.substring(lastEnd, end).trim();
            if (!sentence.isEmpty()) {
                sentences.add(sentence);
            }
            lastEnd = end;
        }
        
        // 添加剩余内容
        if (lastEnd < paragraph.length()) {
            String remaining = paragraph.substring(lastEnd).trim();
            if (!remaining.isEmpty()) {
                sentences.add(remaining);
            }
        }
        
        return sentences;
    }
    
    /**
     * 创建分页
     */
    private List<PageContentVO> createPages(List<SentenceInfo> sentences, String originalContent, 
                                           String title, int wordsPerPage, Long chapterId, String contentType) {
        List<PageContentVO> pages = new ArrayList<>();
        List<SentenceInfo> currentPageSentences = new ArrayList<>();
        int currentPageLength = 0;
        int pageNumber = 1;
        
        for (SentenceInfo sentenceInfo : sentences) {
            String sentence = sentenceInfo.getText();
            
            // 检查添加这个句子是否会超出页面限制
            if (currentPageLength + sentence.length() <= wordsPerPage || currentPageSentences.isEmpty()) {
                // 可以添加到当前页（或者是页面的第一个句子）
                currentPageSentences.add(sentenceInfo);
                currentPageLength += sentence.length();
            } else {
                // 当前页已满，保存当前页
                if (!currentPageSentences.isEmpty()) {
                    String pageContent = buildPageContent(currentPageSentences, originalContent);
                    PageContentVO page = new PageContentVO(pageContent, title, chapterId, pageNumber, contentType);
                    pages.add(page);
                    pageNumber++;
                }
                
                // 开始新页
                currentPageSentences = new ArrayList<>();
                currentPageSentences.add(sentenceInfo);
                currentPageLength = sentence.length();
            }
        }
        
        // 处理最后一页
        if (!currentPageSentences.isEmpty()) {
            String pageContent = buildPageContent(currentPageSentences, originalContent);
            PageContentVO page = new PageContentVO(pageContent, title, chapterId, pageNumber, contentType);
            pages.add(page);
        }
        
        return pages;
    }
    
    /**
     * 构建页面内容
     */
    private String buildPageContent(List<SentenceInfo> sentences, String originalContent) {
        if (sentences.isEmpty()) {
            return "";
        }
        
        // 如果是纯文本，直接拼接
        if (!originalContent.contains("<")) {
            return buildTextPageContent(sentences);
        }
        
        // 如果是HTML，尝试保持HTML结构
        return buildHtmlPageContent(sentences, originalContent);
    }
    
    /**
     * 构建纯文本页面内容
     */
    private String buildTextPageContent(List<SentenceInfo> sentences) {
        StringBuilder content = new StringBuilder();
        int lastParagraphIndex = -1;
        
        for (SentenceInfo sentence : sentences) {
            // 如果是新段落，添加段落分隔
            if (sentence.getParagraphIndex() != lastParagraphIndex && content.length() > 0) {
                content.append("\n\n");
            }
            
            content.append(sentence.getText());
            lastParagraphIndex = sentence.getParagraphIndex();
        }
        
        return content.toString();
    }
    
    /**
     * 构建HTML页面内容 - 保持原有HTML格式
     */
    private String buildHtmlPageContent(List<SentenceInfo> sentences, String originalContent) {
        // 如果原内容包含特殊样式，直接返回纯文本（让前端处理格式）
        if (originalContent.contains("preface-content") || originalContent.contains("chapter-background-text")) {
            return buildTextPageContent(sentences);
        }
        
        // 对于富文本HTML内容，尝试保持原有格式
        // 直接拼接句子，不破坏HTML结构
        StringBuilder htmlContent = new StringBuilder();
        
        for (SentenceInfo sentence : sentences) {
            htmlContent.append(sentence.getText());
            // 如果句子结尾不是标点符号或HTML标签，添加空格
            String text = sentence.getText().trim();
            if (!text.isEmpty() && !text.endsWith(">") && !text.matches(".*[。！？；，]$")) {
                htmlContent.append(" ");
            }
        }
        
        return htmlContent.toString().trim();
    }
    
    /**
     * 构建章节内容（背景说明 + 正文）
     */
    private String buildChapterContent(String backgroundText, String content) {
        StringBuilder combined = new StringBuilder();
        
        if (StringUtils.hasText(backgroundText)) {
            String processedBackground = backgroundText.replace("\n", "<br>");
            combined.append("<div class=\"chapter-background-text\" style=\"font-style: italic; color: #666; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;\">")
                    .append(processedBackground)
                    .append("</div>");
        }
        
        if (StringUtils.hasText(content)) {
            combined.append(content);
        }
        
        return combined.toString();
    }
    
    /**
     * 构建引言内容
     */
    private String buildPrefaceContent(String prefaceContent) {
        String processedContent = prefaceContent.replace("\n", "<br>");
        return "<div class=\"preface-content\" style=\"font-style: italic; color: #555; line-height: 1.8; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; border-left: 4px solid #6c757d; margin-bottom: 20px;\">" 
                + processedContent + "</div>";
    }
    
    /**
     * 简化的HTML内容分页 - 保持原有格式
     */
    private List<PageContentVO> paginateHtmlContentSimple(String htmlContent, String title, int wordsPerPage, Long chapterId, String contentType) {
        List<PageContentVO> pages = new ArrayList<>();
        
        // 提取纯文本用于字数计算
        String textContent = extractTextContent(htmlContent);
        log.debug("HTML分页: 原始长度={}, 纯文本长度={}, 每页字数={}", htmlContent.length(), textContent.length(), wordsPerPage);
        
        // 如果内容很短，直接返回一页
        if (textContent.length() <= wordsPerPage) {
            PageContentVO page;
            if (chapterId != null) {
                page = new PageContentVO(htmlContent, title, chapterId, 1, contentType);
            } else {
                page = new PageContentVO(htmlContent, title, 1);
                page.setContentType(contentType);
            }
            pages.add(page);
            log.debug("内容较短，返回单页: 页数=1");
            return pages;
        }
        
        // 使用更简单可靠的分页逻辑
        List<String> htmlPages = splitHtmlContentReliably(htmlContent, textContent, wordsPerPage);
        
        log.debug("分页结果: 期望字数={}, 实际页数={}", wordsPerPage, htmlPages.size());
        
        for (int i = 0; i < htmlPages.size(); i++) {
            String pageContent = htmlPages.get(i);
            if (pageContent != null && !pageContent.trim().isEmpty()) {
                String pageText = extractTextContent(pageContent);
                PageContentVO page;
                if (chapterId != null) {
                    page = new PageContentVO(pageContent, title, chapterId, i + 1, contentType);
                } else {
                    page = new PageContentVO(pageContent, title, i + 1);
                    page.setContentType(contentType);
                }
                pages.add(page);
                log.debug("添加页面 {}: HTML长度={}, 文本长度={}, 文本内容: {}", 
                        i + 1, pageContent.length(), pageText.length(), 
                        pageText.length() > 50 ? pageText.substring(0, 50) + "..." : pageText);
            }
        }
        
        log.debug("HTML分页完成: 总页数={}", pages.size());
        return pages;
    }
    
    /**
     * 按长度分割HTML内容，尽量保持完整的段落
     */
    private List<String> splitHtmlByLength(String htmlContent, int maxLength) {
        List<String> pages = new ArrayList<>();
        
        // 如果内容很短，直接返回
        String textContent = extractTextContent(htmlContent);
        if (textContent.length() <= maxLength) {
            pages.add(htmlContent);
            return pages;
        }
        
        // 尝试按<p>标签分割
        if (htmlContent.contains("<p>")) {
            String[] paragraphs = htmlContent.split("(?i)(?=<p>)|(?<=</p>)");
            return splitParagraphsByLength(paragraphs, maxLength, htmlContent);
        }
        
        // 如果没有<p>标签，按<br>或换行分割
        if (htmlContent.contains("<br>") || htmlContent.contains("\n")) {
            String[] lines = htmlContent.split("(?i)<br\\s*/?\\s*>|\\n");
            return splitLinesByLength(lines, maxLength, htmlContent);
        }
        
        // 最后按字符数强制分割
        return splitByCharacterLength(htmlContent, maxLength);
    }
    
    /**
     * 按段落长度分割
     */
    private List<String> splitParagraphsByLength(String[] paragraphs, int maxLength, String originalContent) {
        List<String> pages = new ArrayList<>();
        StringBuilder currentPage = new StringBuilder();
        int currentLength = 0;
        
        for (String paragraph : paragraphs) {
            if (paragraph == null || paragraph.trim().isEmpty()) continue;
            
            String cleanText = extractTextContent(paragraph);
            
            // 如果添加这个段落会超出限制，并且当前页面不为空
            if (currentLength + cleanText.length() > maxLength && currentLength > 0) {
                pages.add(currentPage.toString().trim());
                currentPage = new StringBuilder();
                currentLength = 0;
            }
            
            currentPage.append(paragraph);
            currentLength += cleanText.length();
        }
        
        // 添加最后一页
        if (currentPage.length() > 0) {
            pages.add(currentPage.toString().trim());
        }
        
        return pages.isEmpty() ? Arrays.asList(originalContent) : pages;
    }
    
    /**
     * 按行长度分割
     */
    private List<String> splitLinesByLength(String[] lines, int maxLength, String originalContent) {
        List<String> pages = new ArrayList<>();
        StringBuilder currentPage = new StringBuilder();
        int currentLength = 0;
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line == null) line = "";
            
            String cleanText = extractTextContent(line);
            
            // 如果添加这行会超出限制，并且当前页面不为空
            if (currentLength + cleanText.length() > maxLength && currentLength > 0) {
                pages.add(currentPage.toString().trim());
                currentPage = new StringBuilder();
                currentLength = 0;
            }
            
            currentPage.append(line);
            if (i < lines.length - 1) {
                currentPage.append("<br>");
            }
            currentLength += cleanText.length();
        }
        
        // 添加最后一页
        if (currentPage.length() > 0) {
            pages.add(currentPage.toString().trim());
        }
        
        return pages.isEmpty() ? Arrays.asList(originalContent) : pages;
    }
    
    /**
     * 按字符数强制分割
     */
    private List<String> splitByCharacterLength(String content, int maxLength) {
        List<String> pages = new ArrayList<>();
        String textContent = extractTextContent(content);
        
        if (textContent.length() <= maxLength) {
            pages.add(content);
            return pages;
        }
        
        // 简单按比例分割HTML内容
        int totalChars = textContent.length();
        int numPages = (int) Math.ceil((double) totalChars / maxLength);
        int htmlLengthPerPage = content.length() / numPages;
        
        for (int i = 0; i < numPages; i++) {
            int start = i * htmlLengthPerPage;
            int end = Math.min((i + 1) * htmlLengthPerPage, content.length());
            
            if (start < content.length()) {
                String page = content.substring(start, end);
                pages.add(page);
            }
        }
        
        return pages.isEmpty() ? Arrays.asList(content) : pages;
    }

    /**
     * 可靠的HTML内容分割方法
     */
    private List<String> splitHtmlContentReliably(String htmlContent, String textContent, int wordsPerPage) {
        List<String> pages = new ArrayList<>();
        
        log.debug("开始分割HTML内容: 原始长度={}, 文本长度={}, 每页字数={}", 
                htmlContent.length(), textContent.length(), wordsPerPage);
        
        // 如果内容很短，直接返回一页
        if (textContent.length() <= wordsPerPage) {
            pages.add(htmlContent);
            log.debug("内容较短，返回单页");
            return pages;
        }
        
        // 使用简单的按比例分割方法，确保内容不丢失
        int totalTextLength = textContent.length();
        int numPages = (int) Math.ceil((double) totalTextLength / wordsPerPage);
        log.debug("预计需要页数: {}", numPages);
        
        // 按比例分割HTML内容
        int htmlLength = htmlContent.length();
        int htmlPerPage = htmlLength / numPages;
        
        for (int i = 0; i < numPages; i++) {
            int start = i * htmlPerPage;
            int end = (i == numPages - 1) ? htmlLength : (i + 1) * htmlPerPage;
            
            if (start < htmlLength) {
                String pageContent = htmlContent.substring(start, end);
                
                // 尝试在合适的位置断开（避免在HTML标签中间断开）
                if (i < numPages - 1 && end < htmlLength) {
                    pageContent = adjustBreakPoint(htmlContent, start, end);
                }
                
                pages.add(pageContent);
                log.debug("添加页面 {}: 起始位置={}, 结束位置={}, 内容长度={}", 
                        i + 1, start, end, pageContent.length());
            }
        }
        
        log.debug("HTML分割完成: 实际页数={}", pages.size());
        return pages;
    }
    
    /**
     * 调整断点位置，避免在HTML标签中间断开
     */
    private String adjustBreakPoint(String htmlContent, int start, int originalEnd) {
        int end = originalEnd;
        
        // 向后查找合适的断点（句号、感叹号、问号、段落结束）
        for (int i = originalEnd; i < Math.min(originalEnd + 100, htmlContent.length()); i++) {
            char c = htmlContent.charAt(i);
            if (c == '。' || c == '！' || c == '？' || 
                (c == '>' && i > 0 && htmlContent.charAt(i-1) == 'p' && 
                 i >= 3 && htmlContent.substring(i-3, i+1).equals("</p>"))) {
                end = i + 1;
                break;
            }
        }
        
        return htmlContent.substring(start, end);
    }
    
    /**
     * 按段落分割HTML内容
     */
    private List<String> splitByParagraphs(String htmlContent, int wordsPerPage) {
        List<String> pages = new ArrayList<>();
        
        log.debug("开始按段落分割HTML: 内容长度={}, 每页字数={}", htmlContent.length(), wordsPerPage);
        
        // 如果HTML内容包含多个<p>标签，按段落分割
        if (htmlContent.contains("<p>") && htmlContent.contains("</p>")) {
            // 按完整的<p>...</p>段落分割
            String[] paragraphs = htmlContent.split("(?=<p>)");
            
            StringBuilder currentPage = new StringBuilder();
            int currentLength = 0;
            
            for (int i = 0; i < paragraphs.length; i++) {
                String paragraph = paragraphs[i];
                if (paragraph == null || paragraph.trim().isEmpty()) continue;
                
                String paragraphText = extractTextContent(paragraph);
                log.debug("处理段落 {}: 文本长度={}, 当前页长度={}", i, paragraphText.length(), currentLength);
                
                // 如果这个段落本身就超过限制，需要进一步分割
                if (paragraphText.length() > wordsPerPage) {
                    // 先保存当前页（如果有内容）
                    if (currentLength > 0) {
                        pages.add(currentPage.toString().trim());
                        currentPage = new StringBuilder();
                        currentLength = 0;
                    }
                    
                    // 分割大段落
                    List<String> splitParagraph = splitLargeParagraph(paragraph, wordsPerPage);
                    pages.addAll(splitParagraph);
                    continue;
                }
                
                // 如果添加这个段落会超出限制，保存当前页
                if (currentLength + paragraphText.length() > wordsPerPage && currentLength > 0) {
                    pages.add(currentPage.toString().trim());
                    log.debug("保存页面: 页数={}, 内容长度={}", pages.size(), currentPage.length());
                    currentPage = new StringBuilder();
                    currentLength = 0;
                }
                
                currentPage.append(paragraph);
                currentLength += paragraphText.length();
            }
            
            // 添加最后一页
            if (currentPage.length() > 0) {
                pages.add(currentPage.toString().trim());
                log.debug("保存最后页面: 总页数={}, 内容长度={}", pages.size(), currentPage.length());
            }
        } else {
            // 如果没有段落标签，按句子分割
            return splitBySentences(htmlContent, wordsPerPage);
        }
        
        log.debug("段落分割完成: 总页数={}", pages.size());
        return pages.isEmpty() ? Arrays.asList(htmlContent) : pages;
    }
    
    /**
     * 分割大段落
     */
    private List<String> splitLargeParagraph(String paragraph, int wordsPerPage) {
        List<String> parts = new ArrayList<>();
        String text = extractTextContent(paragraph);
        
        if (text.length() <= wordsPerPage) {
            parts.add(paragraph);
            return parts;
        }
        
        // 按句子分割大段落
        String[] sentences = paragraph.split("(?<=[。！？]\\s*)");
        StringBuilder currentPart = new StringBuilder();
        int currentLength = 0;
        
        for (String sentence : sentences) {
            String sentenceText = extractTextContent(sentence);
            
            if (currentLength + sentenceText.length() > wordsPerPage && currentLength > 0) {
                parts.add(currentPart.toString().trim());
                currentPart = new StringBuilder();
                currentLength = 0;
            }
            
            currentPart.append(sentence);
            currentLength += sentenceText.length();
        }
        
        if (currentPart.length() > 0) {
            parts.add(currentPart.toString().trim());
        }
        
        return parts;
    }
    
    /**
     * 按句子分割HTML内容
     */
    private List<String> splitBySentences(String htmlContent, int wordsPerPage) {
        List<String> pages = new ArrayList<>();
        
        // 简单按比例分割
        String textContent = extractTextContent(htmlContent);
        int totalLength = textContent.length();
        int numPages = (int) Math.ceil((double) totalLength / wordsPerPage);
        
        int htmlPerPage = htmlContent.length() / numPages;
        
        for (int i = 0; i < numPages; i++) {
            int start = i * htmlPerPage;
            int end = Math.min((i + 1) * htmlPerPage, htmlContent.length());
            
            if (start < htmlContent.length()) {
                String page = htmlContent.substring(start, end);
                
                // 尝试在句子边界结束
                if (i < numPages - 1 && end < htmlContent.length()) {
                    int sentenceEnd = findSentenceEnd(htmlContent, end);
                    if (sentenceEnd > end && sentenceEnd < htmlContent.length()) {
                        page = htmlContent.substring(start, sentenceEnd);
                        // 调整下一页的起始位置
                        htmlPerPage = (htmlContent.length() - sentenceEnd) / (numPages - i - 1);
                    }
                }
                
                pages.add(page);
            }
        }
        
        return pages.isEmpty() ? Arrays.asList(htmlContent) : pages;
    }
    
    /**
     * 查找句子结束位置
     */
    private int findSentenceEnd(String content, int startPos) {
        String[] sentenceEnders = {"。", "！", "？", "</p>"};
        int nearestEnd = startPos;
        
        for (String ender : sentenceEnders) {
            int pos = content.indexOf(ender, startPos);
            if (pos > startPos && pos < nearestEnd + 50) { // 在合理范围内
                nearestEnd = pos + ender.length();
            }
        }
        
        return nearestEnd;
    }

    /**
     * 重新编号页码
     */
    private void renumberPages(List<PageContentVO> pages) {
        // 用于跟踪每个章节的第一页
        Set<Long> seenChapterIds = new HashSet<>();
        
        for (int i = 0; i < pages.size(); i++) {
            PageContentVO page = pages.get(i);
            page.setPageNumber(i + 1);
            
            // 设置是否为第一页（全局第一页或章节第一页）
            boolean isGlobalFirstPage = (i == 0);
            boolean isChapterFirstPage = false;
            
            if (page.getChapterId() != null) {
                // 如果是章节页面，检查是否是该章节的第一页
                isChapterFirstPage = !seenChapterIds.contains(page.getChapterId());
                if (isChapterFirstPage) {
                    seenChapterIds.add(page.getChapterId());
                }
            }
            
            // 引言页面或章节第一页都算作第一页
            page.setIsFirstPage(isGlobalFirstPage || isChapterFirstPage || "preface".equals(page.getContentType()));
        }
    }
    
    /**
     * 句子信息内部类
     */
    private static class SentenceInfo {
        private final String text;
        private final int paragraphIndex;
        private final boolean isLastInParagraph;
        
        public SentenceInfo(String text, int paragraphIndex, boolean isLastInParagraph) {
            this.text = text;
            this.paragraphIndex = paragraphIndex;
            this.isLastInParagraph = isLastInParagraph;
        }
        
        public String getText() { return text; }
        public int getParagraphIndex() { return paragraphIndex; }
        public boolean isLastInParagraph() { return isLastInParagraph; }
    }
}
