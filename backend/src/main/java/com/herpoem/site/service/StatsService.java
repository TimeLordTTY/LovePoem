package com.herpoem.site.service;

import com.herpoem.site.model.vo.StatsVO;

/**
 * 统计服务接口
 * 
 * @author TimeLord
 */
public interface StatsService {

    /**
     * 获取网站统计数据
     */
    StatsVO getWebsiteStats();
}


