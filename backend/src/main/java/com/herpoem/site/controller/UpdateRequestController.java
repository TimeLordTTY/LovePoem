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
     * 提交催更
     */
    @PostMapping
    public Result<UpdateRequestVO> createUpdateRequest(@RequestBody UpdateRequestCreateDTO updateRequestCreateDTO,
                                                      HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        String ipAddress = getClientIpAddress(request);
        
        UpdateRequestVO updateRequest = updateRequestService.createUpdateRequest(updateRequestCreateDTO, userId, ipAddress);
        return Result.success(updateRequest);
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
     * 获取用户的催更历史
     */
    @GetMapping("/user")
    public Result<IPage<UpdateRequestVO>> getUserUpdateRequests(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            HttpServletRequest request) {
        
        Long userId = getCurrentUserId(request);
        IPage<UpdateRequestVO> updateRequests = updateRequestService.getUserUpdateRequests(userId, page, size);
        return Result.success(updateRequests);
    }

    /**
     * 删除催更记录
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteUpdateRequest(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        updateRequestService.deleteUpdateRequest(id, userId);
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