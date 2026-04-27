import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import axios from 'axios';
import { isWebViewFunc } from '@/utils/panel';
import { siteConfig } from '@/config/site';
import { Logo } from '@/components/icons';
import { login, LoginData, checkCaptcha } from "@/api";
import "@/utils/tac.css";
import "@/utils/tac.min.js";
import bgImage from "@/images/bg.jpg";


interface LoginForm {
  username: string;
  password: string;
  captchaId: string;
}



interface CaptchaConfig {
  requestCaptchaDataUrl: string;
  validCaptchaUrl: string;
  bindEl: string;
  validSuccess: (res: any, captcha: any, tac: any) => void;
  validFail?: (res: any, captcha: any, tac: any) => void;
  btnCloseFun?: (event: any, tac: any) => void;
  btnRefreshFun?: (event: any, tac: any) => void;
}

interface CaptchaStyle {
  btnUrl?: string;
  bgUrl?: string;
  logoUrl?: string | null;
  moveTrackMaskBgColor?: string;
  moveTrackMaskBorderColor?: string;
}

export default function IndexPage() {
  const [form, setForm] = useState<LoginForm>({
    username: "",
    password: "",
    captchaId: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [showCaptcha, setShowCaptcha] = useState(false);
  const navigate = useNavigate();
  const tacInstanceRef = useRef<any>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const [isWebView, setIsWebView] = useState(false);
  // 清理验证码实例
  useEffect(() => {
    return () => {
      if (tacInstanceRef.current) {
        tacInstanceRef.current.destroyWindow();
        tacInstanceRef.current = null;
      }
    };
  }, []);
  // 检测是否在WebView中运行
  useEffect(() => {
    setIsWebView(isWebViewFunc());
  }, []);
  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Partial<LoginForm> = {};

    if (!form.username.trim()) {
      newErrors.username = '请输入用户名';
    }

    if (!form.password.trim()) {
      newErrors.password = '请输入密码';
    } else if (form.password.length < 6) {
      newErrors.password = '密码长度至少6位';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理输入变化
  const handleInputChange = (field: keyof LoginForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 初始化验证码
  const initCaptcha = async () => {
    if (!window.TAC || !captchaContainerRef.current) {
      return;
    }

    try {
      // 清理之前的验证码实例
      if (tacInstanceRef.current) {
        tacInstanceRef.current.destroyWindow();
        tacInstanceRef.current = null;
      }

      // 使用axios的baseURL，确保在WebView中使用正确的面板地址
      const baseURL = axios.defaults.baseURL || (import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api/v1/` : '/api/v1/');
      
      const config: CaptchaConfig = {
        requestCaptchaDataUrl: `${baseURL}captcha/generate`,
        validCaptchaUrl: `${baseURL}captcha/verify`, 
        bindEl: "#captcha-container",
        validSuccess: (res: any, _: any, tac: any) => {
          

          form.captchaId = res.data.validToken

          setShowCaptcha(false);
          tac.destroyWindow();
          performLogin();
        },
        validFail: (_: any, _captcha: any, tac: any) => {
          tac.reloadCaptcha();
        },
        btnCloseFun: (_event: any, tac: any) => {
          setShowCaptcha(false);
          tac.destroyWindow();
          setLoading(false);
        },
        btnRefreshFun: (_event: any, tac: any) => {
          tac.reloadCaptcha();
        }
      };

      // 检测暗黑模式
      const isDarkMode = document.documentElement.classList.contains('dark') || 
                        document.documentElement.getAttribute('data-theme') === 'dark' ||
                        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // 根据主题调整颜色
      const trackColor = isDarkMode ? "#4a5568" : "#c96442"; // Claude accent color
      
      const style: CaptchaStyle = {
        bgUrl: bgImage,
        logoUrl: null,
        moveTrackMaskBgColor: trackColor,
        moveTrackMaskBorderColor: trackColor
      };

      tacInstanceRef.current = new window.TAC(config, style);
      tacInstanceRef.current.init();

    } catch (error) {
      console.error('初始化验证码失败:', error);
      toast.error('验证码初始化失败，请刷新页面重试');
      setShowCaptcha(false);
      setLoading(false);
    }
  };

  // 执行登录请求
  const performLogin = async () => {


    try {
      const loginData: LoginData = {
        username: form.username.trim(),
        password: form.password,
        captchaId: form.captchaId,
      };

      const response = await login(loginData);
      
      if (response.code !== 0) {
        toast.error(response.msg || "登录失败");
        return;
      }

      // 检查是否需要强制修改密码
      if (response.data.requirePasswordChange) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem("role_id", response.data.role_id.toString());
        localStorage.setItem("name", response.data.name);
        localStorage.setItem("admin", (response.data.role_id === 0).toString());
        toast.success('检测到默认密码，即将跳转到修改密码页面');
        navigate("/change-password");
        return;
      }

      // 保存登录信息
      localStorage.setItem('token', response.data.token);
      localStorage.setItem("role_id", response.data.role_id.toString());
      localStorage.setItem("name", response.data.name);
      localStorage.setItem("admin", (response.data.role_id === 0).toString());

      // 登录成功
      toast.success('登录成功');
      navigate("/dashboard");

    } catch (error) {
      console.error('登录错误:', error);
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // 先检查是否需要验证码
      const checkResponse = await checkCaptcha();
      
      if (checkResponse.code !== 0) {
        toast.error("检查验证码状态失败，请重试" + checkResponse.msg);
        setLoading(false);
        return;
      }

      // 根据返回值决定是否显示验证码
      if (checkResponse.data === 0) {
        // 不需要验证码，直接登录
        await performLogin();
      } else {
        // 需要验证码，显示验证码弹层
        setShowCaptcha(true);
        // 延时初始化验证码，确保DOM已渲染
        setTimeout(() => {
          initCaptcha();
        }, 100);
      }
    } catch (error) {
      console.error('检查验证码状态错误:', error);
      toast.error("网络错误，请稍后重试" + error);
      setLoading(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f0eb] dark:bg-[#1a1614] flex flex-col">
      {/* 主体：三段式垂直居中 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">

        {/* Logo + 品牌名 */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#c96442] flex items-center justify-center shadow-md">
            <Logo size={22} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da] tracking-tight">
            {siteConfig.name}
          </h1>
        </div>

        {/* 登录卡片 */}
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-[#231e1b] border border-[#dbd5cc] dark:border-[#2d2824] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-7 pt-7 pb-2">
              <h2 className="text-[17px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da] mb-1">
                登录到您的账户
              </h2>
              <p className="text-[13px] text-[#9b9590] dark:text-[#5d5854]">
                请输入用户名和密码继续
              </p>
            </div>

            <div className="px-7 pb-7 pt-5 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#6b6560] dark:text-[#8a8480] uppercase tracking-wide">
                  用户名
                </label>
                <input
                  type="text"
                  placeholder="请输入用户名"
                  value={form.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  className={`w-full px-3.5 py-2.5 text-[14px] rounded-xl border bg-white dark:bg-[#1a1614] text-[#1a1a1a] dark:text-[#e8e2da] placeholder-[#c4bdb6] dark:placeholder-[#4d4844] outline-none transition-all
                    ${errors.username
                      ? 'border-[#E24B4A] focus:ring-2 focus:ring-[#E24B4A]/20'
                      : 'border-[#dbd5cc] dark:border-[#3d3834] focus:border-[#c96442] focus:ring-2 focus:ring-[#c96442]/15'
                    }
                    disabled:opacity-50`}
                />
                {errors.username && (
                  <p className="text-[12px] text-[#E24B4A]">{errors.username}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#6b6560] dark:text-[#8a8480] uppercase tracking-wide">
                  密码
                </label>
                <input
                  type="password"
                  placeholder="请输入密码"
                  value={form.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={loading}
                  className={`w-full px-3.5 py-2.5 text-[14px] rounded-xl border bg-white dark:bg-[#1a1614] text-[#1a1a1a] dark:text-[#e8e2da] placeholder-[#c4bdb6] dark:placeholder-[#4d4844] outline-none transition-all
                    ${errors.password
                      ? 'border-[#E24B4A] focus:ring-2 focus:ring-[#E24B4A]/20'
                      : 'border-[#dbd5cc] dark:border-[#3d3834] focus:border-[#c96442] focus:ring-2 focus:ring-[#c96442]/15'
                    }
                    disabled:opacity-50`}
                />
                {errors.password && (
                  <p className="text-[12px] text-[#E24B4A]">{errors.password}</p>
                )}
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="mt-1 w-full py-2.5 px-4 bg-[#c96442] hover:bg-[#b5583a] active:bg-[#a34e34] text-white text-[14px] font-semibold rounded-xl transition-all duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {showCaptcha ? "验证中…" : "登录中…"}
                  </>
                ) : "登录"}
              </button>
            </div>
          </div>
        </div>

        {/* 底部版权 */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-[12px] text-[#b8b0a8] dark:text-[#3d3834]">
            Powered by{' '}
            <a
              href="https://github.com/chenzai666/flux-panel"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9b9590] dark:text-[#4d4844] hover:text-[#c96442] dark:hover:text-[#c96442] transition-colors"
            >
              flux-panel
            </a>
            {' '}v{isWebView ? siteConfig.app_version : siteConfig.version}
          </p>
        </div>
      </div>

      {/* 验证码弹层 */}
      {showCaptcha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm captcha-backdrop-enter" />
          <div className="mb-4 relative z-10">
            <div
              id="captcha-container"
              ref={captchaContainerRef}
              className="w-full flex justify-center"
              style={{
                filter: document.documentElement.classList.contains('dark') ||
                  document.documentElement.getAttribute('data-theme') === 'dark' ||
                  window.matchMedia('(prefers-color-scheme: dark)').matches
                  ? 'brightness(0.8) contrast(0.9)' : 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
