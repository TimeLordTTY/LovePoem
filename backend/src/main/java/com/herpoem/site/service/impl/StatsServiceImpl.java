package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.entity.Series;
import com.herpoem.site.model.entity.Tag;
import com.herpoem.site.model.vo.StatsVO;
import com.herpoem.site.service.PostService;
import com.herpoem.site.service.SeriesService;
import com.herpoem.site.service.StatsService;
import com.herpoem.site.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 统计服务实现类
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class StatsServiceImpl implements StatsService {

    private final PostService postService;
    private final TagService tagService;
    private final SeriesService seriesService;

    @Override
    public StatsVO getWebsiteStats() {
        StatsVO stats = new StatsVO();
        
        // 统计文章数量
        stats.setTotalPosts(postService.count());
        stats.setPublishedPosts(postService.count(
            new LambdaQueryWrapper<Post>()
                .eq(Post::getStatus, "PUBLISHED")
        ));
        stats.setDraftPosts(postService.count(
            new LambdaQueryWrapper<Post>()
                .eq(Post::getStatus, "DRAFT")
        ));
        
        // 统计标签数量
        stats.setTotalTags(tagService.count());
        
        // 统计系列数量
        stats.setTotalSeries(seriesService.count());
        
        // 模拟访问量数据（实际项目中可以从访问统计表获取）
        stats.setTotalViews(stats.getPublishedPosts() * 50 + 1000);
        
        return stats;
    }
}
