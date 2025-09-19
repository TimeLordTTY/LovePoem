package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.SettingMapper;
import com.herpoem.site.model.entity.Setting;
import com.herpoem.site.service.SettingService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 系统设置服务实现
 * 
 * @author TimeLord
 */
@Service
public class SettingServiceImpl extends ServiceImpl<SettingMapper, Setting> implements SettingService {
    
    @Override
    public String getValue(String key) {
        QueryWrapper<Setting> wrapper = new QueryWrapper<>();
        wrapper.eq("setting_key", key);
        Setting setting = this.getOne(wrapper);
        return setting != null ? setting.getValue() : null;
    }
    
    @Override
    public String getValue(String key, String defaultValue) {
        String value = getValue(key);
        return value != null ? value : defaultValue;
    }
    
    @Override
    public void setValue(String key, String value) {
        QueryWrapper<Setting> wrapper = new QueryWrapper<>();
        wrapper.eq("setting_key", key);
        Setting setting = this.getOne(wrapper);
        
        if (setting != null) {
            setting.setValue(value);
            setting.setUpdatedAt(LocalDateTime.now());
            this.updateById(setting);
        } else {
            setting = new Setting();
            setting.setSettingKey(key);
            setting.setValue(value);
            setting.setIsSystem(false);
            setting.setCreatedAt(LocalDateTime.now());
            setting.setUpdatedAt(LocalDateTime.now());
            this.save(setting);
        }
    }
    
    @Override
    public void setValues(Map<String, String> settings) {
        settings.forEach(this::setValue);
    }
    
    @Override
    public List<Setting> getByGroup(String groupName) {
        QueryWrapper<Setting> wrapper = new QueryWrapper<>();
        wrapper.eq("group_name", groupName);
        wrapper.orderByAsc("id");
        return this.list(wrapper);
    }
    
    @Override
    public Map<String, List<Setting>> getAllGrouped() {
        List<Setting> allSettings = this.list();
        return allSettings.stream()
                .collect(Collectors.groupingBy(
                    setting -> setting.getGroupName() != null ? setting.getGroupName() : "其他"
                ));
    }
}
