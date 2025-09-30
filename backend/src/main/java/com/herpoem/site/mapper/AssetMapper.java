package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.Asset;
import com.herpoem.site.model.vo.AssetVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 资源Mapper接口
 *
 * @author TimeLord
 */
@Mapper
public interface AssetMapper extends BaseMapper<Asset> {
    
    /**
     * 分页查询资源列表
     */
    IPage<AssetVO> selectAssetPage(Page<AssetVO> page, @Param("type") Asset.AssetType type, @Param("keyword") String keyword);
    
    /**
     * 根据URL查询资源
     */
    Asset selectByUrl(@Param("url") String url);
    
    /**
     * 查询最近上传的图片
     */
    List<AssetVO> selectRecentImages(@Param("limit") Integer limit);
}


