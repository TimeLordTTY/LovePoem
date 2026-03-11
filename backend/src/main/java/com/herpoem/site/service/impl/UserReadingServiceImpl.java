package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.mapper.UserReadingProgressMapper;
import com.herpoem.site.model.entity.UserReadingProgress;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.service.UserReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 用户阅读进度服务实现
 */
@Service
@RequiredArgsConstructor
public class UserReadingServiceImpl extends ServiceImpl<UserReadingProgressMapper, UserReadingProgress>
        implements UserReadingService {

    private final UserReadingProgressMapper userReadingProgressMapper;

    @Override
    @Transactional
    public void reportProgress(Long userId, Long postId, int currentPage, int totalPages) {
        if (userId == null || postId == null) {
            return;
        }
        if (currentPage < 1 || totalPages < 1 || currentPage > totalPages) {
            return;
        }

        LambdaQueryWrapper<UserReadingProgress> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserReadingProgress::getUserId, userId)
               .eq(UserReadingProgress::getPostId, postId);

        UserReadingProgress existing = this.getOne(wrapper);
        LocalDateTime now = LocalDateTime.now();

        if (existing == null) {
            UserReadingProgress progress = new UserReadingProgress();
            progress.setUserId(userId);
            progress.setPostId(postId);
            progress.setCurrentPage(currentPage);
            progress.setTotalPages(totalPages);
            progress.setLastReadAt(now);
            this.save(progress);
        } else {
            existing.setCurrentPage(currentPage);
            existing.setTotalPages(totalPages);
            existing.setLastReadAt(now);
            this.updateById(existing);
        }
    }

    @Override
    public PageResult<PostListVO> getRecentReadingList(Long userId, Integer page, Integer size) {
        Page<PostListVO> pageParam = new Page<>(page, size);
        IPage<PostListVO> result = userReadingProgressMapper.selectUserReadingList(pageParam, userId);

        return PageResult.<PostListVO>builder()
                .records(result.getRecords())
                .total(result.getTotal())
                .pages(result.getPages())
                .current(result.getCurrent())
                .size(result.getSize())
                .build();
    }
}

