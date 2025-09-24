package com.herpoem.site.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.herpoem.site.model.dto.UpdateRequestCreateDTO;
import com.herpoem.site.model.vo.UpdateRequestVO;

/**
 * 催更服务接口
 * 
 * @author TimeLord
 */
public interface UpdateRequestService {

    /**
     * 创建催更（简化版，一键催更）
     */
    void createUpdateRequest(Long postId, String ipAddress);

    /**
     * 获取文章的催更列表
     */
    IPage<UpdateRequestVO> getPostUpdateRequests(Long postId, Integer page, Integer size);

    /**
     * 获取今日催更统计
     */
    Integer getTodayUpdateRequestCount(Long postId);

    /**
     * 检查IP今日是否已催更
     */
    boolean checkTodayUpdateRequestByIp(Long postId, String ipAddress);

    /**
     * 删除催更记录
     */
    void deleteUpdateRequest(Long id);

    /**
     * 获取管理员催更列表
     */
    IPage<UpdateRequestVO> getAdminUpdateRequests(Integer page, Integer size);
} 