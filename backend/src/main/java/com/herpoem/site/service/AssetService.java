package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.model.entity.Asset;
import com.herpoem.site.model.vo.AssetVO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 资源服务接口
 *
 * @author TimeLord
 */
public interface AssetService extends IService<Asset> {
    
    /**
     * 上传图片并保存到资源表
     */
    AssetVO uploadImage(MultipartFile file, String title);
    
    /**
     * 分页查询资源列表
     */
    PageResult<AssetVO> getAssetPage(Integer page, Integer size, Asset.AssetType type, String keyword);
    
    /**
     * 根据URL查询资源
     */
    Asset getAssetByUrl(String url);
    
    /**
     * 查询最近上传的图片
     */
    List<AssetVO> getRecentImages(Integer limit);
    
    /**
     * 删除资源
     */
    void deleteAsset(Long id);
}


