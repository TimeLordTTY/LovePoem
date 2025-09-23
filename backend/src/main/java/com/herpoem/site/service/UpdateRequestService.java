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
     * 创建催更
     */
    UpdateRequestVO createUpdateRequest(UpdateRequestCreateDTO updateRequestCreateDTO, Long userId, String ipAddress);

    /**
     * 获取文章的催更列表
     */
    IPage<UpdateRequestVO> getPostUpdateRequests(Long postId, Integer page, Integer size);

    /**
     * 获取今日催更统计
     */
    Integer getTodayUpdateRequestCount(Long postId);

    /**
     * 获取用户催更历史
     */
    IPage<UpdateRequestVO> getUserUpdateRequests(Long userId, Integer page, Integer size);

    /**
     * 删除催更记录
     */
    void deleteUpdateRequest(Long id, Long userId);

    /**
     * 获取管理员催更列表
     */
    IPage<UpdateRequestVO> getAdminUpdateRequests(Integer page, Integer size, String type);
} 