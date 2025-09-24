package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.UpdateRequestMapper;
import com.herpoem.site.model.entity.UpdateRequest;
import com.herpoem.site.model.vo.UpdateRequestVO;
import com.herpoem.site.service.UpdateRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 催更服务实现类（简化版）
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class UpdateRequestServiceImpl extends ServiceImpl<UpdateRequestMapper, UpdateRequest> implements UpdateRequestService {

    private final UpdateRequestMapper updateRequestMapper;

    @Override
    @Transactional
    public void createUpdateRequest(Long postId, String ipAddress) {
        // 验证输入
        if (postId == null) {
            throw new IllegalArgumentException("文章ID不能为空");
        }
        if (ipAddress == null || ipAddress.trim().isEmpty()) {
            throw new IllegalArgumentException("IP地址不能为空");
        }

        // 检查今日该IP是否已催更
        Integer todayCount = updateRequestMapper.checkTodayUpdateRequestByIp(postId, ipAddress);
        if (todayCount > 0) {
            throw new IllegalArgumentException("今日已催更，请明天再来");
        }

        UpdateRequest updateRequest = new UpdateRequest();
        updateRequest.setPostId(postId);
        updateRequest.setIpAddress(ipAddress);
        updateRequest.setCreatedAt(LocalDateTime.now());
        updateRequest.setDeleted(0);

        save(updateRequest);

        // 更新文章催更数
        updateRequestMapper.updatePostUpdateRequestCount(postId);
    }

    @Override
    public IPage<UpdateRequestVO> getPostUpdateRequests(Long postId, Integer page, Integer size) {
        Page<UpdateRequestVO> pageParam = new Page<>(page, size);
        return updateRequestMapper.selectPostUpdateRequests(pageParam, postId);
    }

    @Override
    public Integer getTodayUpdateRequestCount(Long postId) {
        return updateRequestMapper.getTodayUpdateRequestCount(postId);
    }

    @Override
    public boolean checkTodayUpdateRequestByIp(Long postId, String ipAddress) {
        Integer count = updateRequestMapper.checkTodayUpdateRequestByIp(postId, ipAddress);
        return count > 0;
    }

    @Override
    @Transactional
    public void deleteUpdateRequest(Long id) {
        UpdateRequest updateRequest = getById(id);
        if (updateRequest == null) {
            throw new IllegalArgumentException("催更记录不存在");
        }

        // 软删除
        updateRequest.setDeleted(1);
        updateById(updateRequest);

        // 更新文章催更数
        updateRequestMapper.updatePostUpdateRequestCount(updateRequest.getPostId());
    }

    @Override
    public IPage<UpdateRequestVO> getAdminUpdateRequests(Integer page, Integer size) {
        Page<UpdateRequestVO> pageParam = new Page<>(page, size);
        return updateRequestMapper.selectAdminUpdateRequests(pageParam);
    }
} 