package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.PostTypeVO;
import com.herpoem.site.service.PostTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文章类型控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/post-types")
@RequiredArgsConstructor
public class PostTypeController {
    
    private final PostTypeService postTypeService;
    
    /**
     * 获取所有文章类型
     */
    @GetMapping
    public Result<List<PostTypeVO>> getAllPostTypes() {
        try {
            List<PostTypeVO> postTypes = postTypeService.getAllPostTypes();
            return Result.success(postTypes);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
}
