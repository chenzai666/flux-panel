import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import toast from 'react-hot-toast';
import { updateConfigs, exportConfig, importConfig } from '@/api';
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
  const [loading, setLoading] = useState(Object.keys(initialConfigs).length === 0); // 如果有缓存数据，不显示loading
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfigs, setOriginalConfigs] = useState<Record<string, string>>(initialConfigs);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 导出备份
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportConfig();
      if (res.code === 0 && res.data) {
        // 生成下载文件
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `flux-panel-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('备份导出成功');
      } else {
        toast.error('导出失败: ' + (res.msg || '未知错误'));
      }
    } catch (error) {
      toast.error('导出备份出错');
    } finally {
      setExporting(false);
    }
  };

  // 选择导入文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('请选择 JSON 格式的备份文件');
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        // 预览数据
        const preview: any = {};
        if (data.version) preview.version = data.version;
        if (data.exportTimeStr) preview.exportTimeStr = data.exportTimeStr;

        const tables = ['vite_config', 'node', 'tunnel', 'user', 'user_tunnel', 'speed_limit', 'forward'];
        const tableNames: Record<string, string> = {
          vite_config: '网站配置',
          node: '节点',
          tunnel: '隧道',
          user: '用户',
          user_tunnel: '用户隧道',
          speed_limit: '限速规则',
          forward: '转发'
        };

        preview.tables = tables
          .filter(t => data[t] && Array.isArray(data[t]) && data[t].length > 0)
          .map(t => ({
            key: t,
            name: tableNames[t] || t,
            count: data[t].length
          }));

        setImportPreview(preview);
        setImportModalOpen(true);
      } catch (err) {
        toast.error('备份文件格式错误，请检查文件内容');
      }
    };
    reader.readAsText(file);
    // 重置 input 以便重复选择同一文件
    e.target.value = '';
  };

  // 确认导入
  const confirmImport = async () => {
    if (!importFile) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          const res = await importConfig(data);
          if (res.code === 0) {
            toast.success(res.data?.message || '导入成功');
            setImportModalOpen(false);
            setImportFile(null);
            setImportPreview(null);
            // 重新加载配置
            loadConfigs();
          } else {
            toast.error('导入失败: ' + (res.msg || '未知错误'));
          }
        } catch (err) {
          toast.error('导入数据解析失败');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(importFile);
    } catch (error) {
      toast.error('导入备份出错');
      setImporting(false);
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
            <span className="text-sm text-[#1a1a1a] dark:text-[#9b9590]">
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
    
      <div className="px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <SettingsIcon className="w-8 h-8 text-[#c96442] dark:text-[#d4856a]" />
          <div>
            <h1 className="text-2xl font-bold">网站配置</h1>
            <p className="text-[#6b6560] dark:text-[#9b9590]">
              管理网站的基本信息和显示设置
            </p>
          </div>
        </div>

        <Card className="rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center w-full">
              <div>
                <h2 className="text-xl font-semibold">基本设置</h2>
                <p className="text-sm text-[#6b6560] dark:text-[#9b9590]">
                  配置网站的基本信息，这些设置会影响网站的显示效果
                </p>
              </div>
              <div className="flex gap-2">
                {/* 隐藏的文件选择 input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="flat"
                  color="primary"
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  }
                  onPress={handleExport}
                  isLoading={exporting}
                >
                  导出备份
                </Button>
                <Button
                  variant="flat"
                  color="primary"
                  startContent={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  }
                  onPress={() => fileInputRef.current?.click()}
                  isLoading={importing}
                >
                  导入备份
                </Button>

                <Button
                  color="primary"
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
                    <label className="text-sm font-medium text-[#1a1a1a] dark:text-[#9b9590]">
                      {item.label}
                    </label>
                    {item.description && (
                      <p className="text-xs text-[#9b9590] dark:text-[#5d5854]">
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
          <Card className="mt-4 rounded-2xl bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
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

        {/* 备份导入确认弹窗 */}
        <Modal 
          isOpen={importModalOpen}
          onOpenChange={setImportModalOpen}
          size="2xl"
          scrollBehavior="outside"
          backdrop="blur"
          placement="center"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">确认导入备份</h2>
                </ModalHeader>
                <ModalBody>
                  {importPreview && (
                    <>
                      <p className="text-[#6b6560] dark:text-[#8a8480]">
                        即将导入以下备份数据到当前面板：
                      </p>
                      {importPreview.version && (
                        <p className="text-sm text-[#9b9590] dark:text-[#5d5854]">
                          备份版本：{importPreview.version}
                        </p>
                      )}
                      {importPreview.exportTimeStr && (
                        <p className="text-sm text-[#9b9590] dark:text-[#5d5854]">
                          导出时间：{importPreview.exportTimeStr}
                        </p>
                      )}
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e2da]">包含数据：</p>
                        {importPreview.tables?.map((t: any) => (
                          <div key={t.key} className="flex items-center gap-2 text-sm text-[#6b6560] dark:text-[#8a8480]">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            <span>{t.name}</span>
                            <span className="text-xs text-[#9b9590] dark:text-[#5d5854]">({t.count} 条)</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-xl">
                        <p className="text-sm text-warning-700 dark:text-warning-300">
                          ⚠️ 导入操作会将备份数据追加到现有数据中，不会删除已有数据。如果存在重复数据可能导致冲突，建议先导出当前备份再导入新数据。
                        </p>
                      </div>
                    </>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    取消
                  </Button>
                  <Button 
                    color="primary" 
                    onPress={confirmImport}
                    isLoading={importing}
                  >
                    确认导入
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    
  );
} 