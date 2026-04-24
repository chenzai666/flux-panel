import React, { useState, useEffect } from 'react';
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Input } from "@heroui/input";
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { isWebViewFunc } from '@/utils/panel';
import { siteConfig } from '@/config/site';
import { updatePassword } from '@/api';
import { safeLogout } from '@/utils/logout';
interface PasswordForm {
  newUsername: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}


interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newUsername: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // 获取用户信息
    const name = localStorage.getItem('name') || 'Admin';
    
    // 兼容处理：如果没有admin字段，根据role_id判断（0为管理员）
    let adminFlag = localStorage.getItem('admin') === 'true';
    if (localStorage.getItem('admin') === null) {
      const roleId = parseInt(localStorage.getItem('role_id') || '1', 10);
      adminFlag = roleId === 0;
      // 补充设置admin字段，避免下次再次判断
      localStorage.setItem('admin', adminFlag.toString());
    }
    
    setUsername(name);
    setIsAdmin(adminFlag);
  }, []);

  // 管理员菜单项 - 更精致的图标和配色
  const adminMenuItems: MenuItem[] = [
    {
      path: '/limit',
      label: '限速管理',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-500/15',
      description: '管理用户限速策略'
    },
    {
      path: '/user',
      label: '用户管理',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-500/15',
      description: '管理系统用户'
    },
    {
      path: '/config',
      label: '网站配置',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-500/15',
      description: '配置网站设置'
    }
  ];

  // 退出登录
  const handleLogout = () => {
    safeLogout();
    navigate('/', { replace: true });
  };

  // 密码表单验证
  const validatePasswordForm = (): boolean => {
    if (!passwordForm.newUsername.trim()) {
      toast.error('请输入新用户名');
      return false;
    }
    if (passwordForm.newUsername.length < 3) {
      toast.error('用户名长度至少3位');
      return false;
    }
    if (!passwordForm.currentPassword) {
      toast.error('请输入当前密码');
      return false;
    }
    if (!passwordForm.newPassword) {
      toast.error('请输入新密码');
      return false;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码长度不能少于6位');
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入密码不一致');
      return false;
    }
    return true;
  };

  // 提交密码修改
  const handlePasswordSubmit = async () => {
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    try {
      const response = await updatePassword(passwordForm);
      if (response.code === 0) {
        toast.success('密码修改成功，请重新登录');
        onOpenChange();
        handleLogout();
      } else {
        toast.error(response.msg || '密码修改失败');
      }
    } catch (error) {
      toast.error('修改密码时发生错误');
      console.error('修改密码错误:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  // 重置密码表单
  const resetPasswordForm = () => {
    setPasswordForm({
      newUsername: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="px-4 py-5 flex flex-col h-full">

      <div className="space-y-4 flex-1">
        {/* 用户信息卡片 - 更精致的头像和布局 */}
        <div className="bg-white dark:bg-[#231e1b] rounded-2xl border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center space-x-4">
            {/* 头像 - 渐变背景 */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c96442] to-[#d4856a] flex items-center justify-center shadow-md">
              <span className="text-white text-xl font-bold">
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[#1a1a1a] dark:text-[#e8e2da] truncate">{username}</h3>
              <div className="flex items-center space-x-2 mt-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                  isAdmin 
                    ? 'bg-[#c96442]/10 text-[#c96442] dark:bg-[#d4856a]/15 dark:text-[#d4856a]' 
                    : 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400'
                }`}>
                  {isAdmin ? '管理员' : '普通用户'}
                </span>
                <span className="text-[11px] text-[#9b9590] dark:text-[#5d5854]">
                  {new Date().toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 管理员功能 - 列表式菜单项 */}
        {isAdmin && (
          <div className="bg-white dark:bg-[#231e1b] rounded-2xl border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-4 pt-3 pb-1">
              <span className="text-[11px] font-semibold text-[#9b9590] dark:text-[#5d5854] uppercase tracking-wider">管理功能</span>
            </div>
            {adminMenuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`h5-list-item w-full flex items-center px-4 py-3.5 text-left ${
                  index < adminMenuItems.length - 1 ? 'border-b border-[#f5f1eb] dark:border-[#2d2824]' : ''
                }`}
              >
                <div className={`w-9 h-9 ${item.bgColor} ${item.color} rounded-xl flex items-center justify-center mr-3 flex-shrink-0`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e2da]">{item.label}</div>
                  <div className="text-[11px] text-[#9b9590] dark:text-[#5d5854] mt-0.5">{item.description}</div>
                </div>
                <svg className="w-4 h-4 text-[#c9c3bb] dark:text-[#4d4844] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* 常用功能 - 列表式菜单项 */}
        <div className="bg-white dark:bg-[#231e1b] rounded-2xl border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <span className="text-[11px] font-semibold text-[#9b9590] dark:text-[#5d5854] uppercase tracking-wider">常用功能</span>
          </div>
          
          {/* 修改密码 */}
          <button
            onClick={onOpen}
            className="h5-list-item w-full flex items-center px-4 py-3.5 text-left border-b border-[#f5f1eb] dark:border-[#2d2824]"
          >
            <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e2da]">修改密码</div>
              <div className="text-[11px] text-[#9b9590] dark:text-[#5d5854] mt-0.5">更新登录密码</div>
            </div>
            <svg className="w-4 h-4 text-[#c9c3bb] dark:text-[#4d4844] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* 退出登录 */}
          <button
            onClick={handleLogout}
            className="h5-list-item w-full flex items-center px-4 py-3.5 text-left"
          >
            <div className="w-9 h-9 bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-red-500 dark:text-red-400">退出登录</div>
              <div className="text-[11px] text-[#9b9590] dark:text-[#5d5854] mt-0.5">退出当前账号</div>
            </div>
            <svg className="w-4 h-4 text-[#c9c3bb] dark:text-[#4d4844] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* 底部版本信息 */}
        <div className="text-center py-6">
          <p className="text-[11px] text-[#9b9590] dark:text-[#5d5854]">
            Powered by{' '}
            <a 
              href="https://github.com/bqlpfy/flux-panel" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#9b9590] dark:text-[#5d5854] hover:text-[#6b6560] dark:hover:text-[#9b9590] transition-colors"
            >
              flux-panel
            </a>
          </p>
          <p className="text-[11px] text-[#9b9590] dark:text-[#5d5854] mt-0.5">
            v{ isWebViewFunc() ? siteConfig.app_version : siteConfig.version}
          </p>
        </div>
      </div>

      {/* 修改密码弹窗 */}
      <Modal 
        isOpen={isOpen} 
        onOpenChange={() => {
          onOpenChange();
          resetPasswordForm();
        }}
        size="2xl"
      scrollBehavior="outside"
      backdrop="blur"
      placement="center"
      >
        <ModalContent>
          {(onClose: () => void) => (
            <>
              <ModalHeader className="flex flex-col gap-1">修改密码</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="新用户名"
                    placeholder="请输入新用户名（至少3位）"
                    value={passwordForm.newUsername}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, newUsername: e.target.value }))}
                    variant="bordered"
                  />
                  <Input
                    label="当前密码"
                    type="password"
                    placeholder="请输入当前密码"
                    value={passwordForm.currentPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    variant="bordered"
                  />
                  <Input
                    label="新密码"
                    type="password"
                    placeholder="请输入新密码（至少6位）"
                    value={passwordForm.newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    variant="bordered"
                  />
                  <Input
                    label="确认密码"
                    type="password"
                    placeholder="请再次输入新密码"
                    value={passwordForm.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    variant="bordered"
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button 
                  color="primary" 
                  onPress={handlePasswordSubmit}
                  isLoading={passwordLoading}
                >
                  确定
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
