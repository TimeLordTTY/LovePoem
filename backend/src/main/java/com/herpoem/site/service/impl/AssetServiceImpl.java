package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.mapper.AssetMapper;
import com.herpoem.site.model.entity.Asset;
import com.herpoem.site.model.vo.AssetVO;
import com.herpoem.site.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * 资源服务实现类
 *
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class AssetServiceImpl extends ServiceImpl<AssetMapper, Asset> implements AssetService {
    
    private final AssetMapper assetMapper;
    
    @Value("${app.upload.path:uploads}")
    private String uploadPath;
    
    @Value("${app.upload.url-prefix:/uploads}")
    private String urlPrefix;
    
    @Override
    @Transactional
    public AssetVO uploadImage(MultipartFile file, String title) {
        if (file.isEmpty()) {
            throw new RuntimeException("请选择要上传的图片");
        }
        
        // 检查文件类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new RuntimeException("只能上传图片文件");
        }
        
        // 检查文件大小 (5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("图片大小不能超过5MB");
        }
        
        try {
            // 创建上传目录
            String dateFolder = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            
            File baseUploadDir = new File(uploadPath);
            if (!baseUploadDir.isAbsolute()) {
                baseUploadDir = new File(System.getProperty("user.dir"), uploadPath);
            }
            
            File uploadDir = new File(baseUploadDir, dateFolder);
            if (!uploadDir.exists()) {
                boolean created = uploadDir.mkdirs();
                if (!created) {
                    throw new RuntimeException("无法创建上传目录: " + uploadDir.getAbsolutePath());
                }
            }
            
            // 生成唯一文件名
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;
            
            // 保存文件
            File destFile = new File(uploadDir, filename);
            file.transferTo(destFile);
            
            // 保存到数据库
            String url = urlPrefix + "/" + dateFolder + "/" + filename;
            Asset asset = new Asset();
            asset.setUrl(url);
            asset.setType(Asset.AssetType.image);
            asset.setTitle(title != null ? title : originalFilename);
            
            this.save(asset);
            
            // 返回VO
            AssetVO assetVO = new AssetVO();
            assetVO.setId(asset.getId());
            assetVO.setUrl(asset.getUrl());
            assetVO.setType(asset.getType());
            assetVO.setTitle(asset.getTitle());
            assetVO.setCreatedAt(asset.getCreatedAt());
            
            return assetVO;
            
        } catch (IOException e) {
            throw new RuntimeException("文件上传失败: " + e.getMessage());
        }
    }
    
    @Override
    public PageResult<AssetVO> getAssetPage(Integer page, Integer size, Asset.AssetType type, String keyword) {
        Page<AssetVO> pageParam = new Page<>(page, size);
        IPage<AssetVO> result = assetMapper.selectAssetPage(pageParam, type, keyword);
        
        return PageResult.<AssetVO>builder()
                .records(result.getRecords())
                .total(result.getTotal())
                .pages(result.getPages())
                .current(result.getCurrent())
                .size(result.getSize())
                .build();
    }
    
    @Override
    public Asset getAssetByUrl(String url) {
        return assetMapper.selectByUrl(url);
    }
    
    @Override
    public List<AssetVO> getRecentImages(Integer limit) {
        return assetMapper.selectRecentImages(limit);
    }
    
    @Override
    @Transactional
    public void deleteAsset(Long id) {
        Asset asset = this.getById(id);
        if (asset == null) {
            throw new RuntimeException("资源不存在");
        }
        
        // 软删除
        this.removeById(id);
        
        // TODO: 可以选择是否删除物理文件
        // 这里暂时不删除物理文件，避免其他地方引用出现问题
    }
}


