package com.herpoem.site.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.UpdateRequestCreateDTO;
import com.herpoem.site.model.vo.UpdateRequestVO;
import com.herpoem.site.service.UpdateRequestService;
import com.herpoem.site.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 催更控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/update-requests")
@RequiredArgsConstructor
public class UpdateRequestController {

    private final UpdateRequestService updateRequestService;
    private final JwtUtil jwtUtil;

    /**
     * 提交催更（简化版，一键催更）
     */
    @PostMapping
    public Result<String> createUpdateRequest(@RequestBody UpdateRequestCreateDTO updateRequestCreateDTO,
                                             HttpServletRequest request) {
        String ipAddress = getClientIpAddress(request);
        
        updateRequestService.createUpdateRequest(updateRequestCreateDTO.getPostId(), ipAddress);
        return Result.success("催更成功");
    }

    /**
     * 获取文章的催更列表
     */
    @GetMapping("/post/{postId}")
    public Result<IPage<UpdateRequestVO>> getPostUpdateRequests(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        
        IPage<UpdateRequestVO> updateRequests = updateRequestService.getPostUpdateRequests(postId, page, size);
        return Result.success(updateRequests);
    }

    /**
     * 获取今日催更统计
     */
    @GetMapping("/post/{postId}/today-count")
    public Result<Integer> getTodayUpdateRequestCount(@PathVariable Long postId) {
        Integer count = updateRequestService.getTodayUpdateRequestCount(postId);
        return Result.success(count);
    }

    /**
     * 检查IP今日是否已催更
     */
    @GetMapping("/post/{postId}/check-ip")
    public Result<Boolean> checkTodayUpdateRequestByIp(
            @PathVariable Long postId,
            HttpServletRequest request) {
        
        String ipAddress = getClientIpAddress(request);
        boolean hasUpdated = updateRequestService.checkTodayUpdateRequestByIp(postId, ipAddress);
        return Result.success(hasUpdated);
    }

    /**
     * 删除催更记录（管理员功能）
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteUpdateRequest(@PathVariable Long id) {
        updateRequestService.deleteUpdateRequest(id);
        return Result.success();
    }

    /**
     * 获取当前用户ID
     */
    private Long getCurrentUserId(HttpServletRequest request) {
        String token = getTokenFromRequest(request);
        if (token == null || !jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("未登录或token已过期");
        }
        return jwtUtil.getUserIdFromToken(token);
    }

    /**
     * 获取Token
     */
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    /**
     * 获取客户端IP地址
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
} 