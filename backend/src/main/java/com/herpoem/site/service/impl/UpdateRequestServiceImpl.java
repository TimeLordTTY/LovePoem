package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.UpdateRequestMapper;
import com.herpoem.site.model.dto.UpdateRequestCreateDTO;
import com.herpoem.site.model.entity.UpdateRequest;
import com.herpoem.site.model.vo.UpdateRequestVO;
import com.herpoem.site.service.UpdateRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * 催更服务实现类
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class UpdateRequestServiceImpl extends ServiceImpl<UpdateRequestMapper, UpdateRequest> implements UpdateRequestService {

    private final UpdateRequestMapper updateRequestMapper;

    @Override
    @Transactional
    public UpdateRequestVO createUpdateRequest(UpdateRequestCreateDTO updateRequestCreateDTO, Long userId, String ipAddress) {
        // 验证输入
        if (updateRequestCreateDTO.getPostId() == null) {
            throw new IllegalArgumentException("文章ID不能为空");
        }

        // 检查今日催更次数限制
        Integer todayCount = updateRequestMapper.getTodayUserUpdateRequestCount(updateRequestCreateDTO.getPostId(), userId);
        if (todayCount >= 3) { // 假设每天最多催更3次
            throw new IllegalArgumentException("今日催更次数已达上限");
        }

        UpdateRequest updateRequest = new UpdateRequest();
        updateRequest.setPostId(updateRequestCreateDTO.getPostId());
        updateRequest.setUserId(userId);
        updateRequest.setMessage(updateRequestCreateDTO.getMessage());
        updateRequest.setType(updateRequestCreateDTO.getType() != null ? updateRequestCreateDTO.getType() : "GENERAL");
        updateRequest.setIpAddress(ipAddress);
        updateRequest.setCreatedAt(LocalDateTime.now());
        updateRequest.setDeleted(0);

        save(updateRequest);

        // 更新文章催更数
        updateRequestMapper.updatePostUpdateRequestCount(updateRequestCreateDTO.getPostId());

        // 返回催更VO
        return updateRequestMapper.selectUpdateRequestById(updateRequest.getId());
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
    public IPage<UpdateRequestVO> getUserUpdateRequests(Long userId, Integer page, Integer size) {
        Page<UpdateRequestVO> pageParam = new Page<>(page, size);
        return updateRequestMapper.selectUserUpdateRequests(pageParam, userId);
    }

    @Override
    @Transactional
    public void deleteUpdateRequest(Long id, Long userId) {
        UpdateRequest updateRequest = getById(id);
        if (updateRequest == null) {
            throw new IllegalArgumentException("催更记录不存在");
        }

        // 检查权限：只有催更者或管理员可以删除
        if (!updateRequest.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权删除此催更记录");
        }

        // 软删除
        updateRequest.setDeleted(1);
        updateById(updateRequest);

        // 更新文章催更数
        updateRequestMapper.updatePostUpdateRequestCount(updateRequest.getPostId());
    }

    @Override
    public IPage<UpdateRequestVO> getAdminUpdateRequests(Integer page, Integer size, String type) {
        Page<UpdateRequestVO> pageParam = new Page<>(page, size);
        return updateRequestMapper.selectAdminUpdateRequests(pageParam, type);
    }
} 