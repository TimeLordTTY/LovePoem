package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.UserReadingProgress;
import com.herpoem.site.model.vo.PostListVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 用户阅读进度 Mapper
 */
@Mapper
public interface UserReadingProgressMapper extends BaseMapper<UserReadingProgress> {

    /**
     * 分页查询用户最近阅读的文章列表
     */
    IPage<PostListVO> selectUserReadingList(Page<PostListVO> page, @Param("userId") Long userId);
}

