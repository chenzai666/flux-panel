package com.admin.controller;


import com.admin.common.annotation.RequireRole;
import com.admin.common.aop.LogAnnotation;
import com.admin.common.lang.R;
import com.admin.service.BackupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * <p>
 *  网站配置控制器
 * </p>
 *
 * @author QAQ
 * @since 2025-07-24
 */
@RestController
@CrossOrigin
@RequestMapping("/api/v1/config")
public class ViteConfigController extends BaseController {

    @Autowired
    private BackupService backupService;

    /**
     * 获取所有网站配置
     * 前端无需权限即可访问，用于获取网站基本信息
     */
    @LogAnnotation
    @PostMapping("/list")
    public R getConfigs() {
        return viteConfigService.getConfigs();
    }

    /**
     * 根据配置名获取配置值
     * 前端无需权限即可访问，用于获取特定配置
     */
    @LogAnnotation
    @PostMapping("/get")
    public R getConfigByName(@RequestBody Map<String, Object> params) {
        String name = params.get("name").toString();
        return viteConfigService.getConfigByName(name);
    }

    /**
     * 批量更新网站配置
     * 需要管理员权限
     */
    @LogAnnotation
    @RequireRole
    @PostMapping("/update")
    public R updateConfigs(@RequestBody Map<String, String> configMap) {
        return viteConfigService.updateConfigs(configMap);
    }

    /**
     * 更新单个配置项
     * 需要管理员权限
     */
    @LogAnnotation
    @RequireRole
    @PostMapping("/update-single")
    public R updateConfig(@RequestBody Map<String, Object> params) {
        String name = params.get("name").toString();
        String value = params.get("value").toString();
        return viteConfigService.updateConfig(name, value);
    }

    /**
     * 导出所有配置
     * 需要管理员权限
     */
    @LogAnnotation
    @RequireRole
    @PostMapping("/export")
    public R exportConfigs() {
        return viteConfigService.exportConfigs();
    }

    /**
     * 导入配置
     * 需要管理员权限
     */
    @LogAnnotation
    @RequireRole
    @PostMapping("/import")
    public R importConfigs(@RequestBody Map<String, String> params) {
        String configsJson = params.get("configs");
        return viteConfigService.importConfigs(configsJson);
    }

    /**
     * 导出完整备份（包含所有数据）
     * 需要管理员权限
     */
    @LogAnnotation
    @RequireRole
    @PostMapping("/backup/export")
    public R exportBackup() {
        return backupService.exportAll();
    }

    /**
     * 导入完整备份（包含所有数据）
     * 需要管理员权限
     */
    @LogAnnotation
    @RequireRole
    @PostMapping("/backup/import")
    public R importBackup(@RequestBody Map<String, String> params) {
        String backupJson = params.get("backup");
        return backupService.importAll(backupJson);
    }

}
