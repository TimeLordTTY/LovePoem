package com.herpoem.site;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 她的诗集网站主启动类
 * 
 * @author TimeLord
 */
@SpringBootApplication
@MapperScan("com.herpoem.site.mapper")
public class LovePoemApplication {

    public static void main(String[] args) {
        SpringApplication.run(LovePoemApplication.class, args);
    }
}
