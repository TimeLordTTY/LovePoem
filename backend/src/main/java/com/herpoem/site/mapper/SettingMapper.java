package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.Setting;
import org.apache.ibatis.annotations.Mapper;

/**
 * 系统设置 Mapper 接口
 * 
 * @author TimeLord
 */
@Mapper
public interface SettingMapper extends BaseMapper<Setting> {
}


