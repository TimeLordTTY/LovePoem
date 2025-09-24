package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.UpdateRequest;
import com.herpoem.site.model.vo.UpdateRequestVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 催更Mapper接口
 * 
 * @author TimeLord
 */
@Mapper
public interface UpdateRequestMapper extends BaseMapper<UpdateRequest> {

    /**
     * 获取文章的催更列表
     */
    IPage<UpdateRequestVO> selectPostUpdateRequests(Page<UpdateRequestVO> page, @Param("postId") Long postId);

    /**
     * 根据ID获取催更详情
     */
    UpdateRequestVO selectUpdateRequestById(@Param("id") Long id);

    /**
     * 更新文章催更数
     */
    void updatePostUpdateRequestCount(@Param("postId") Long postId);

    /**
     * 获取今日催更统计
     */
    Integer getTodayUpdateRequestCount(@Param("postId") Long postId);

    /**
     * 检查IP今日是否已催更
     */
    Integer checkTodayUpdateRequestByIp(@Param("postId") Long postId, @Param("ipAddress") String ipAddress);

    /**
     * 获取管理员催更列表
     */
    IPage<UpdateRequestVO> selectAdminUpdateRequests(Page<UpdateRequestVO> page);
} 