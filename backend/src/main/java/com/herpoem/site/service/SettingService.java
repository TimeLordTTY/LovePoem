package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.model.entity.Setting;

import java.util.List;
import java.util.Map;

/**
 * 系统设置服务接口
 * 
 * @author TimeLord
 */
public interface SettingService extends IService<Setting> {
    
    /**
     * 获取设置值
     */
    String getValue(String key);
    
    /**
     * 获取设置值，如果不存在返回默认值
     */
    String getValue(String key, String defaultValue);
    
    /**
     * 设置值
     */
    void setValue(String key, String value);
    
    /**
     * 批量设置
     */
    void setValues(Map<String, String> settings);
    
    /**
     * 按分组获取设置
     */
    List<Setting> getByGroup(String groupName);
    
    /**
     * 获取所有设置按分组分类
     */
    Map<String, List<Setting>> getAllGrouped();
}
