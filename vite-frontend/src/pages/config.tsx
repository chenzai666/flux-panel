import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input, Textarea } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import toast from 'react-hot-toast';
import { updateConfigs, exportBackup, importBackup } from '@/api';
import { SettingsIcon } from '@/components/icons';

import { isAdmin } from '@/utils/auth';
import { getCachedConfigs, clearConfigCache, updateSiteConfig } from '@/config/site';

// 简单的保存图标组件
const SaveIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17,21 17,13 7,13 7,21" />
    <polyline points="7,3 7,8 15,8" />
  </svg>
);

interface ConfigItem {
  key: string;
  label: string;
  placeholder?: string;
  description?: string;
  type: 'input' | 'switch' | 'select' | 'textarea';
  options?: { label: string; value: string; description?: string }[];
  dependsOn?: string; // 依赖的配置项key
  dependsValue?: string; // 依赖的配置项值
}

// 网站配置项定义
const CONFIG_ITEMS: ConfigItem[] = [
  {
    key: 'ip',
    label: '面板后端地址',
    placeholder: '请输入面板后端IP:PORT',
    description: '格式“ip:port”,用于对接节点时使用,ip是你安装面板服务器的公网ip,端口是安装脚本内输入的后端端口。不要套CDN,不支持https,通讯数据有加密',
    type: 'input'
  },
  {
    key: 'app_name',
    label: '应用名称',
    placeholder: '请输入应用名称',
    description: '在浏览器标签页和导航栏显示的应用名称',
    type: 'input'
  },
  {
    key: 'captcha_enabled',
    label: '启用验证码',
    description: '开启后，用户登录时需要完成验证码验证',
    type: 'switch'
  },
  {
    key: 'captcha_type',
    label: '验证码类型',
    description: '选择验证码的显示类型，不同类型有不同的安全级别',
    type: 'select',
    dependsOn: 'captcha_enabled',
    dependsValue: 'true',
    options: [
      { 
        label: '随机类型', 
        value: 'RANDOM', 
        description: '系统随机选择验证码类型' 
      },
      { 
        label: '滑块验证码', 
        value: 'SLIDER', 
        description: '拖动滑块完成拼图验证' 
      },
      { 
        label: '文字点选验证码', 
        value: 'WORD_IMAGE_CLICK', 
        description: '按顺序点击指定文字' 
      },
      { 
        label: '旋转验证码', 
        value: 'ROTATE', 
        description: '旋转图片到正确角度' 
      },
      { 
        label: '拼图验证码', 
        value: 'CONCAT', 
        description: '拖动滑块完成图片拼接' 
      }
    ]
  },
  {
    key: 'announcement',
    label: '网站公告',
    placeholder: '请输入公告内容，留空则不显示公告',
    description: '设置后将显示在用户首页顶部，支持换行。留空则不显示公告',
    type: 'textarea'
  }
];

// 初始化时从缓存读取配置，避免闪烁
const getInitialConfigs = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  
  const configKeys = ['app_name', 'captcha_enabled', 'captcha_type', 'ip', 'announcement'];
  const initialConfigs: Record<string, string> = {};
  
  try {
    configKeys.forEach(key => {
      const cachedValue = localStorage.getItem('vite_config_' + key);
      if (cachedValue) {
        initialConfigs[key] = cachedValue;
      }
    });
  } catch (error) {
  }
  
  return initialConfigs;
};

export default function ConfigPage() {
  const navigate = useNavigate();
  const initialConfigs = getInitialConfigs();
  const [configs, setConfigs] = useState<Record<string, string>>(initialConfigs);
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(Object.keys(initialConfigs).length === 0); // 如果有缓存数据，不显示loading
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfigs, setOriginalConfigs] = useState<Record<string, string>>(initialConfigs);

  // 权限检查
  useEffect(() => {
    if (!isAdmin()) {
      toast.error('权限不足，只有管理员可以访问此页面');
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [navigate]);

  // 加载配置数据（优先从缓存）
  const loadConfigs = async (currentConfigs?: Record<string, string>) => {
    const configsToCompare = currentConfigs || configs;
    const hasInitialData = Object.keys(configsToCompare).length > 0;
    
    // 如果已有缓存数据，不显示loading，静默更新
    if (!hasInitialData) {
      setLoading(true);
    }
    
    try {
      const configData = await getCachedConfigs();
      
      // 只有在数据有变化时才更新
      const hasDataChanged = JSON.stringify(configData) !== JSON.stringify(configsToCompare);
      if (hasDataChanged) {
        setConfigs(configData);
        setOriginalConfigs({ ...configData });
        setHasChanges(false);
      } else {
      }
    } catch (error) {
      // 只有在没有缓存数据时才显示错误
      if (!hasInitialData) {
        toast.error('加载配置出错，请重试');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 延迟加载，避免阻塞初始渲染
    const timer = setTimeout(() => {
      loadConfigs(initialConfigs);
    }, 100);

    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次

  // 处理配置项变更
  const handleConfigChange = (key: string, value: string) => {
    let newConfigs = { ...configs, [key]: value };
    
    // 特殊处理：启用验证码时，如果验证码类型未设置，默认为随机
    if (key === 'captcha_enabled' && value === 'true') {
      if (!newConfigs.captcha_type) {
        newConfigs.captcha_type = 'RANDOM';
      }
    }
    
    setConfigs(newConfigs);
    
    // 检查是否有变更
    const hasChangesNow = Object.keys(newConfigs).some(
      k => newConfigs[k] !== originalConfigs[k]
    ) || Object.keys(originalConfigs).some(
      k => originalConfigs[k] !== newConfigs[k]
    );
    setHasChanges(hasChangesNow);
  };

  // 导出备份
  const handleExport = async () => {
    setBackupLoading(true);
    try {
      const response = await exportBackup();
      if (response.code !== 0) {
        toast.error('导出失败: ' + response.msg);
        return;
      }
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flux-panel-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('备份已下载');
    } catch {
      toast.error('导出失败，请重试');
    } finally {
      setBackupLoading(false);
    }
  };

  // 导入备份
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const response = await importBackup(data);
      if (response.code !== 0) {
        toast.error('导入失败: ' + response.msg);
        return;
      }
      toast.success(response.data || '导入成功，请刷新页面');
    } catch (err: any) {
      toast.error('文件解析失败: ' + (err?.message || '请确认文件格式正确'));
    } finally {
      setImportLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await updateConfigs(configs);
      if (response.code === 0) {
        toast.success('配置保存成功');
        
        // 清除所有配置缓存，强制下次重新获取
        clearConfigCache();
        
        // 获取变更的配置项
        const changedKeys = Object.keys(configs).filter(
          key => configs[key] !== originalConfigs[key]
        );
        
        setOriginalConfigs({ ...configs });
        setHasChanges(false);
        
        // 如果应用名称发生变化，立即更新网站配置
        if (changedKeys.includes('app_name')) {
          await updateSiteConfig();
        }
        
        // 触发配置更新事件，通知其他组件
        window.dispatchEvent(new CustomEvent('configUpdated', { 
          detail: { changedKeys } 
        }));
      } else {
        toast.error('保存配置失败: ' + response.msg);
      }
    } catch (error) {
      toast.error('保存配置出错，请重试');
    } finally {
      setSaving(false);
    }
  };



  // 检查配置项是否应该显示（依赖检查）
  const shouldShowItem = (item: ConfigItem): boolean => {
    if (!item.dependsOn || !item.dependsValue) {
      return true;
    }
    return configs[item.dependsOn] === item.dependsValue;
  };

  // 渲染不同类型的配置项
  const renderConfigItem = (item: ConfigItem) => {
    const isChanged = hasChanges && configs[item.key] !== originalConfigs[item.key];
    
    switch (item.type) {
      case 'input':
        return (
          <Input
            value={configs[item.key] || ''}
            onChange={(e) => handleConfigChange(item.key, e.target.value)}
            placeholder={item.placeholder}
            variant="bordered"
            size="md"
            classNames={{
              input: "text-sm",
              inputWrapper: isChanged 
                ? "border-warning-300 data-[hover=true]:border-warning-400" 
                : ""
            }}
          />
        );

      case 'switch':
        return (
          <Switch
            isSelected={configs[item.key] === 'true'}
            onValueChange={(checked) => handleConfigChange(item.key, checked ? 'true' : 'false')}
            color="primary"
            size="md"
            classNames={{
              wrapper: isChanged ? "border-warning-300" : ""
            }}
          >
            <span className="text-sm text-[#6b5a4e] dark:text-[#b5a99a]">
              {configs[item.key] === 'true' ? '已启用' : '已禁用'}
            </span>
          </Switch>
        );

      case 'select':
        return (
          <Select
            selectedKeys={configs[item.key] ? [configs[item.key]] : []}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              if (selectedKey) {
                handleConfigChange(item.key, selectedKey);
              }
            }}
            placeholder="请选择验证码类型"
            variant="bordered"
            size="md"
            classNames={{
              trigger: isChanged 
                ? "border-warning-300 data-[hover=true]:border-warning-400" 
                : ""
            }}
          >
            {item.options?.map((option) => (
              <SelectItem 
                key={option.value}
                description={option.description}
              >
                {option.label}
              </SelectItem>
            )) || []}
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={configs[item.key] || ''}
            onChange={(e) => handleConfigChange(item.key, e.target.value)}
            placeholder={item.placeholder}
            variant="bordered"
            minRows={3}
            maxRows={8}
            classNames={{
              input: "text-sm",
              inputWrapper: isChanged
                ? "border-warning-300 data-[hover=true]:border-warning-400"
                : ""
            }}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      
        <div className="flex items-center justify-center min-h-[400px]">
          <Spinner size="lg" label="加载配置中..." />
        </div>
      
    );
  }

  return (
    
      <div className="p-6 max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">网站配置</h1>
            <p className="text-[#6b5a4e] dark:text-[#9c8678]">
              管理网站的基本信息和显示设置
            </p>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center w-full">
              <div>
                <h2 className="text-xl font-semibold">基本设置</h2>
                <p className="text-sm text-[#6b5a4e] dark:text-[#9c8678]">
                  配置网站的基本信息，这些设置会影响网站的显示效果
                </p>
              </div>
              <div className="flex gap-2">

                <Button
                  className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg disabled:opacity-50"
                  startContent={<SaveIcon className="w-4 h-4" />}
                  onClick={handleSave}
                  isLoading={saving}
                  disabled={!hasChanges}
                >
                  {saving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <Divider />

          <CardBody className="space-y-6 pt-6">
            {CONFIG_ITEMS.map((item, index) => {
              // 检查配置项是否应该显示
              if (!shouldShowItem(item)) {
                return null;
              }

              // 计算是否是最后一个显示的项目（用于决定是否显示分隔线）
              const remainingItems = CONFIG_ITEMS.slice(index + 1).filter(shouldShowItem);
              const isLastItem = remainingItems.length === 0;

              return (
                <div key={item.key} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#4a3c33] dark:text-[#d4c8bc]">
                      {item.label}
                    </label>
                    {item.description && (
                      <p className="text-xs text-[#9c8678] dark:text-[#7a6b60]">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  {/* 渲染配置项 */}
                  {renderConfigItem(item)}
                  
                  {/* 分隔线 */}
                  {!isLastItem && (
                    <Divider className="mt-6" />
                  )}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* 操作提示 */}
        {hasChanges && (
          <Card className="mt-4 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
            <CardBody className="py-3">
              <div className="flex items-center gap-2 text-warning-700 dark:text-warning-300">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
                <span className="text-sm">
                  检测到配置变更，请记得保存您的修改
                </span>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 备份管理 */}
        <Card className="mt-6 shadow-none border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b]">
          <CardHeader className="pb-2">
            <div>
              <h2 className="text-xl font-semibold">备份管理</h2>
              <p className="text-sm text-[#6b5a4e] dark:text-[#9c8678] mt-1">
                导出当前所有数据备份，或从备份文件恢复。支持导入稳定版 v1.x 备份进行迁移。
              </p>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="pt-5 space-y-5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-4 rounded-xl border border-[#e5e0d8] dark:border-[#2d2824] bg-[#faf8f5] dark:bg-[#2d2824]/30">
                <h3 className="font-medium text-[#4a3c33] dark:text-[#d4c8bc] mb-1">导出备份</h3>
                <p className="text-xs text-[#9c8678] dark:text-[#7a6b60] mb-3">
                  将节点、隧道、转发、用户等所有数据导出为 JSON 文件
                </p>
                <Button
                  size="sm"
                  className="bg-[#c96442] text-white hover:bg-[#b5583a] rounded-lg font-medium"
                  isLoading={backupLoading}
                  onPress={handleExport}
                  startContent={!backupLoading && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                >
                  {backupLoading ? '导出中...' : '导出备份'}
                </Button>
              </div>

              <div className="flex-1 p-4 rounded-xl border border-[#e5e0d8] dark:border-[#2d2824] bg-[#faf8f5] dark:bg-[#2d2824]/30">
                <h3 className="font-medium text-[#4a3c33] dark:text-[#d4c8bc] mb-1">导入备份 / 迁移向导</h3>
                <p className="text-xs text-[#9c8678] dark:text-[#7a6b60] mb-3">
                  从 JSON 文件恢复数据，支持 beta 格式和稳定版 v1.x 自动迁移。<span className="text-[#c96442]">导入会清除现有数据，请谨慎操作。</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  size="sm"
                  variant="flat"
                  className="text-[#c96442] bg-[#c96442]/10 hover:bg-[#c96442]/20 rounded-lg font-medium"
                  isLoading={importLoading}
                  onPress={() => fileInputRef.current?.click()}
                  startContent={!importLoading && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  )}
                >
                  {importLoading ? '导入中...' : '选择文件导入'}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#faf8f5] dark:bg-[#2d2824]/50 border border-[#e5e0d8] dark:border-[#3d3834]">
              <p className="text-xs text-[#9c8678] dark:text-[#7a6b60]">
                <span className="font-medium text-[#6b5a4e] dark:text-[#b5a99a]">迁移说明：</span>
                从稳定版 v1.x 导入时，系统将自动把每条隧道的入口/出口节点转换为 beta 格式的转发链，并从
                <code className="mx-1 px-1 bg-[#e5e0d8] dark:bg-[#3d3834] rounded text-[#4a3c33] dark:text-[#d4c8bc]">in_port</code>
                生成对应的端口记录。中间链路节点需在迁移完成后手动配置。管理员账号不会被导入覆盖。
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    
  );
} 