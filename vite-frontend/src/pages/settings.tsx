import { useState, useEffect } from 'react';
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { reinitializeBaseURL } from '@/api/network';
import { 
  getPanelAddresses, 
  savePanelAddress, 
  setCurrentPanelAddress, 
  deletePanelAddress, 
  validatePanelAddress,
} from '@/utils/panel';

interface PanelAddress {
  name: string;
  address: string;   
  inx: boolean;
}


export const SettingsPage = () => {
  const navigate = useNavigate();
  const [panelAddresses, setPanelAddresses] = useState<PanelAddress[]>([]);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');


  const setPanelAddressesFunc = (newAddress: PanelAddress[]) => {
    setPanelAddresses(newAddress); 
  }

  // 加载面板地址列表
  const loadPanelAddresses = async () => {
    (window as any).setPanelAddresses = setPanelAddressesFunc
    getPanelAddresses();
  };

  // 添加新面板地址
  const addPanelAddress = async () => {
    if (!newName.trim() || !newAddress.trim()) {
      toast.error('请输入名称和地址');
      return;
    }

    // 验证地址格式
    if (!validatePanelAddress(newAddress.trim())) {
      toast.error('地址格式不正确，请检查：\n• 必须是完整的URL格式\n• 必须以 http:// 或 https:// 开头\n• 支持域名、IPv4、IPv6 地址\n• 端口号范围：1-65535\n• 示例：http://192.168.1.100:3000');
      return;
    }
    (window as any).setPanelAddresses = setPanelAddressesFunc
    savePanelAddress(newName.trim(), newAddress.trim());
    setNewName('');
    setNewAddress('');
    toast.success('添加成功');
  };

  // 设置当前面板地址
  const setCurrentPanel = async (name: string) => {
    (window as any).setPanelAddresses = setPanelAddressesFunc
    setCurrentPanelAddress(name);
    reinitializeBaseURL();
  };

  // 删除面板地址
  const handleDeletePanelAddress = async (name: string) => {
    (window as any).setPanelAddresses = setPanelAddressesFunc
    deletePanelAddress(name);
    reinitializeBaseURL();
    toast.success('删除成功');
  };

  // 页面加载时获取数据
  useEffect(() => {
    loadPanelAddresses();
  }, []);

  return (
    <div className="min-h-screen bg-[#f3f0eb] dark:bg-[#1a1614]">
      {/* 顶部导航 */}
      <div className="bg-white dark:bg-[#231e1b] border-b border-[#e5e0d8] dark:border-[#2d2824]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              isIconOnly
              variant="light"
              onClick={() => navigate(-1)}
              className="text-[#6b6560] dark:text-[#8a8480]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-[17px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">面板设置</h1>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-5">
          {/* 添加新地址 */}
          <Card className="border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b] shadow-none rounded-xl">
            <CardBody className="p-5">
              <h2 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da] mb-4 pb-3 border-b border-[#e5e0d8] dark:border-[#2d2824]">添加新面板地址</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="名称"
                    placeholder="请输入面板名称"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    variant="bordered"
                  />
                  <Input
                    label="地址"
                    placeholder="http://192.168.1.100:3000"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    variant="bordered"
                  />
                </div>
                <Button
                  className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg"
                  onClick={addPanelAddress}
                >
                  添加
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* 地址列表 */}
          <Card className="border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b] shadow-none rounded-xl">
            <CardBody className="p-5">
              <h2 className="text-[15px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da] mb-4 pb-3 border-b border-[#e5e0d8] dark:border-[#2d2824]">已保存的面板地址</h2>
              {panelAddresses.length === 0 ? (
                <p className="text-sm text-[#9b9590] dark:text-[#5d5854] text-center py-8">暂无保存的面板地址</p>
              ) : (
                <div className="space-y-3">
                  {panelAddresses.map((panel, index) => (
                    <div key={index} className="border border-[#e5e0d8] dark:border-[#2d2824] rounded-xl p-4 hover:bg-[#f9f8f6] dark:hover:bg-[#2d2824] transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#1a1a1a] dark:text-[#e8e2da] text-sm">{panel.name}</span>
                            {panel.inx && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border badge-status-success">
                                当前
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#9b9590] dark:text-[#5d5854] mt-1 font-mono">{panel.address}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!panel.inx && (
                            <Button
                              size="sm"
                              variant="flat"
                              className="text-[#c96442] dark:text-[#d4856a] border border-[#e5e0d8] dark:border-[#2d2824]"
                              onClick={() => setCurrentPanel(panel.name)}
                            >
                              设为当前
                            </Button>
                          )}
                          <Button
                            size="sm"
                            color="danger"
                            variant="light"
                            onClick={() => handleDeletePanelAddress(panel.name)}
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
