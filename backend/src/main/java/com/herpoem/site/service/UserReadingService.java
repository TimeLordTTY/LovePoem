package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.model.entity.UserReadingProgress;
import com.herpoem.site.model.vo.PostListVO;

/**
 * 用户阅读进度服务
 */
public interface UserReadingService extends IService<UserReadingProgress> {

    /**
     * 上报阅读进度
     */
    void reportProgress(Long userId, Long postId, int currentPage, int totalPages);

    /**
     * 获取用户最近阅读列表
     */
    PageResult<PostListVO> getRecentReadingList(Long userId, Integer page, Integer size);
}

