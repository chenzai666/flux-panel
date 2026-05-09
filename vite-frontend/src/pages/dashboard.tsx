import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { getUserPackageInfo } from "@/api";
import { getCachedConfig } from "@/config/site";

interface UserInfo {
  flow: number;
  inFlow: number;
  outFlow: number;
  num: number;
  expTime?: string;
  flowResetTime?: number;
}

interface UserTunnel {
  id: number;
  tunnelId: number;
  tunnelName: string;
  flow: number;
  inFlow: number;
  outFlow: number;
  num: number;
  expTime?: string;
  flowResetTime?: number;
  tunnelFlow: number;
}

interface Forward {
  id: number;
  name: string;
  tunnelId: number;
  tunnelName: string;
  inIp: string;
  inPort: number;
  remoteAddr: string;
  inFlow: number;
  outFlow: number;
}

interface AddressItem {
  id: number;
  ip: string;
  address: string;
  copying: boolean;
}

interface StatisticsFlow {
  id: number;
  userId: number;
  flow: number;
  totalFlow: number;
  time: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo>({} as UserInfo);
  const [userTunnels, setUserTunnels] = useState<UserTunnel[]>([]);
  const [forwardList, setForwardList] = useState<Forward[]>([]);
  const [statisticsFlows, setStatisticsFlows] = useState<StatisticsFlow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalTitle, setAddressModalTitle] = useState("");
  const [addressList, setAddressList] = useState<AddressItem[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  // 加载公告
  useEffect(() => {
    const loadAnnouncement = async () => {
      const ann = await getCachedConfig("announcement");

      if (ann) {
        setAnnouncement(ann);
        setAnnouncementVisible(true);
      }
    };

    loadAnnouncement();
  }, []);

  // 检查有效期通知
  const checkExpirationNotifications = (
    userInfo: UserInfo,
    tunnels: UserTunnel[],
  ) => {
    // 避免重复通知，检查是否已经显示过
    const notificationKey = `expiration-${userInfo.expTime}-${tunnels.map((t) => t.expTime).join(",")}`;
    const lastNotified = localStorage.getItem("lastNotified");

    if (lastNotified === notificationKey) {
      return; // 已经通知过，不重复显示
    }

    let hasNotification = false;

    // 检查主账户有效期
    if (userInfo.expTime) {
      const expDate = new Date(userInfo.expTime);
      const now = new Date();

      if (!isNaN(expDate.getTime()) && expDate > now) {
        const diffTime = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7 && diffDays > 0) {
          hasNotification = true;
          if (diffDays === 1) {
            toast("账户将于明天过期，请及时续费", {
              icon: "⚠️",
              duration: 6000,
              style: {
                background: "var(--color-semantic-warning-bg)",
                color: "var(--color-semantic-warning-text)",
                border: "1px solid var(--color-semantic-warning-border)",
              },
            });
          } else {
            toast(`账户将于${diffDays}天后过期，请及时续费`, {
              icon: "⚠️",
              duration: 6000,
              style: {
                background: "var(--color-semantic-warning-bg)",
                color: "var(--color-semantic-warning-text)",
                border: "1px solid var(--color-semantic-warning-border)",
              },
            });
          }
        } else if (diffDays <= 0) {
          hasNotification = true;
          toast("账户已过期，请立即续费", {
            icon: "⚠️",
            duration: 8000,
            style: {
              background: "var(--color-semantic-danger-bg)",
              color: "var(--color-semantic-danger-text)",
              border: "1px solid var(--color-semantic-danger-border)",
            },
          });
        }
      }
    }

    // 检查隧道有效期
    tunnels.forEach((tunnel) => {
      if (tunnel.expTime) {
        const expDate = new Date(tunnel.expTime);
        const now = new Date();

        if (!isNaN(expDate.getTime()) && expDate > now) {
          const diffTime = expDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7 && diffDays > 0) {
            hasNotification = true;
            if (diffDays === 1) {
              toast(`隧道"${tunnel.tunnelName}"将于明天过期`, {
                icon: "⚠️",
                duration: 5000,
                style: {
                  background: "var(--color-semantic-warning-bg)",
                  color: "var(--color-semantic-warning-text)",
                  border: "1px solid var(--color-semantic-warning-border)",
                },
              });
            } else {
              toast(`隧道"${tunnel.tunnelName}"将于${diffDays}天后过期`, {
                icon: "⚠️",
                duration: 5000,
                style: {
                  background: "var(--color-semantic-warning-bg)",
                  color: "var(--color-semantic-warning-text)",
                  border: "1px solid var(--color-semantic-warning-border)",
                },
              });
            }
          } else if (diffDays <= 0) {
            hasNotification = true;
            toast(`隧道"${tunnel.tunnelName}"已过期`, {
              icon: "⚠️",
              duration: 6000,
              style: {
                background: "var(--color-semantic-danger-bg)",
                color: "var(--color-semantic-danger-text)",
                border: "1px solid var(--color-semantic-danger-border)",
              },
            });
          }
        }
      }
    });

    // 如果显示了通知，记录防止重复
    if (hasNotification) {
      localStorage.setItem("lastNotified", notificationKey);
    }
  };

  useEffect(() => {
    // 重置状态并加载数据，防止页面切换时显示旧数据
    setLoading(true);
    setUserInfo({} as UserInfo);
    setUserTunnels([]);
    setForwardList([]);
    setStatisticsFlows([]);

    // 检查用户是否是管理员
    const adminStatus = localStorage.getItem("admin");

    setIsAdmin(adminStatus === "true");

    loadPackageData();
    localStorage.setItem("e", "/dashboard");
  }, []);

  const loadPackageData = async () => {
    setLoading(true);
    try {
      const res = await getUserPackageInfo();

      if (res.code === 0) {
        const data = res.data;

        setUserInfo(data.userInfo || {});
        setUserTunnels(data.tunnelPermissions || []);
        setForwardList(data.forwards || []);
        setStatisticsFlows(data.statisticsFlows || []);

        // 检查有效期并显示通知
        checkExpirationNotifications(
          data.userInfo,
          data.tunnelPermissions || [],
        );
      } else {
        toast.error(res.msg || "获取套餐信息失败");
      }
    } catch (error) {
      console.error("获取套餐信息失败:", error);
      toast.error("获取套餐信息失败");
    } finally {
      setLoading(false);
    }
  };

  const formatFlow = (value: number, unit: string = "bytes"): string => {
    // 99999 表示无限制
    if (value === 99999) {
      return "无限制";
    }

    if (unit === "gb") {
      return value + " GB";
    } else {
      if (value === 0) return "0 B";
      if (value < 1024) return value + " B";
      if (value < 1024 * 1024) return (value / 1024).toFixed(2) + " KB";
      if (value < 1024 * 1024 * 1024)
        return (value / (1024 * 1024)).toFixed(2) + " MB";

      return (value / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
  };

  const formatNumber = (value: number): string => {
    // 99999 表示无限制
    if (value === 99999) {
      return "无限制";
    }

    return value.toString();
  };

  // 处理24小时流量统计数据
  const processFlowChartData = () => {
    // 生成最近24小时的时间数组（从当前小时往前推24小时）
    const now = new Date();
    const hours: string[] = [];

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourString = time.getHours().toString().padStart(2, "0") + ":00";

      hours.push(hourString);
    }

    // 创建数据映射
    const flowMap = new Map<string, number>();

    statisticsFlows.forEach((item) => {
      flowMap.set(item.time, item.flow || 0);
    });

    // 生成图表数据，没有数据的小时显示为0
    return hours.map((hour) => ({
      time: hour,
      flow: flowMap.get(hour) || 0,
      // 格式化显示用的流量值
      formattedFlow: formatFlow(flowMap.get(hour) || 0),
    }));
  };

  const getExpStatus = (expTime?: string) => {
    if (!expTime)
      return {
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20",
        text: "永久",
      };

    const now = new Date();
    const expDate = new Date(expTime);

    if (isNaN(expDate.getTime())) {
      return {
        color: "text-[#6b6560] dark:text-[#9b9590]",
        bg: "bg-[#f5f1eb] dark:bg-[#1a1614]/10 border-[#e5e0d8] dark:border-gray-500/20",
        text: "无效",
      };
    }

    if (expDate < now) {
      return {
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
        text: "已过期",
      };
    }

    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return {
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
        text: `${diffDays}天后过期`,
      };
    } else if (diffDays <= 30) {
      return {
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20",
        text: `${diffDays}天后过期`,
      };
    } else {
      return {
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20",
        text: `${diffDays}天后过期`,
      };
    }
  };

  const calculateUserTotalUsedFlow = (): number => {
    // 后端已按计费类型处理流量，前端直接使用入站+出站总和
    return (userInfo.inFlow || 0) + (userInfo.outFlow || 0);
  };

  const calculateUsagePercentage = (type: "flow" | "forwards"): number => {
    if (type === "flow") {
      const totalUsed = calculateUserTotalUsedFlow();
      const totalLimit = (userInfo.flow || 0) * 1024 * 1024 * 1024;

      // 无限制时返回0%
      if (userInfo.flow === 99999) return 0;

      return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
    } else if (type === "forwards") {
      const totalUsed = forwardList.length;
      const totalLimit = userInfo.num || 0;

      // 无限制时返回0%
      if (userInfo.num === 99999) return 0;

      return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
    }

    return 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-[var(--color-progress-danger)]";
    if (percentage >= 70) return "bg-[var(--color-progress-warning)]";

    return "bg-[var(--color-progress-success)]";
  };

  const renderProgressBar = (
    percentage: number,
    size: "sm" | "md" = "md",
    isUnlimited: boolean = false,
  ) => {
    const height = size === "sm" ? "h-1.5" : "h-2";

    if (isUnlimited) {
      return (
        <div className="w-full">
          <div
            className={`w-full rounded-full ${height}`}
            style={{
              background: "var(--color-semantic-info-bg)",
              border: "1px solid var(--color-semantic-info-border)",
            }}
          >
            <div
              className={`${height} rounded-full w-full opacity-60`}
              style={{
                background: "linear-gradient(90deg, #378ADD 0%, #639922 100%)",
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full">
        <div
          className={`w-full bg-[#e5e0d8] dark:bg-[#2d2824] rounded-full ${height}`}
        >
          <div
            className={`${height} rounded-full transition-all duration-300 ${getUsageColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const calculateTunnelUsedFlow = (tunnel: UserTunnel): number => {
    if (!tunnel) return 0;
    const inFlow = tunnel.inFlow || 0;
    const outFlow = tunnel.outFlow || 0;

    // 后端已按计费类型处理流量，前端直接使用入站+出站总和
    return inFlow + outFlow;
  };

  const calculateTunnelFlowPercentage = (tunnel: UserTunnel): number => {
    const totalUsed = calculateTunnelUsedFlow(tunnel);
    const totalLimit = (tunnel.flow || 0) * 1024 * 1024 * 1024;

    // 无限制时返回0%
    if (tunnel.flow === 99999) return 0;

    return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
  };

  const getTunnelUsedForwards = (tunnelId: number): number => {
    return forwardList.filter((forward) => forward.tunnelId === tunnelId)
      .length;
  };

  const calculateTunnelForwardPercentage = (tunnel: UserTunnel): number => {
    const totalUsed = getTunnelUsedForwards(tunnel.tunnelId);
    const totalLimit = tunnel.num || 0;

    // 无限制时返回0%
    if (tunnel.num === 99999) return 0;

    return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
  };

  const formatResetTime = (resetDay?: number): string => {
    if (resetDay === undefined || resetDay === null) return "";
    if (resetDay === 0) return "不重置";

    const now = new Date();
    const currentDay = now.getDate();

    let daysUntilReset;

    if (resetDay > currentDay) {
      daysUntilReset = resetDay - currentDay;
    } else if (resetDay < currentDay) {
      const nextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        resetDay,
      );
      const diffTime = nextMonth.getTime() - now.getTime();

      daysUntilReset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      daysUntilReset = 0;
    }

    if (daysUntilReset === 0) {
      return "今日重置";
    } else if (daysUntilReset === 1) {
      return "明日重置";
    } else {
      return `${daysUntilReset}天后重置`;
    }
  };

  const groupedForwards = () => {
    const groups: {
      [key: string]: { tunnelName: string; forwards: Forward[] };
    } = {};

    forwardList.forEach((forward) => {
      const tunnelName = forward.tunnelName || "未知隧道";

      if (!groups[tunnelName]) {
        groups[tunnelName] = {
          tunnelName,
          forwards: [],
        };
      }
      groups[tunnelName].forwards.push(forward);
    });

    return Object.values(groups);
  };

  const formatInAddress = (ipString: string, port: number): string => {
    if (!ipString || !port) return "";

    const ips = ipString
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip);

    if (ips.length === 0) return "";

    if (ips.length === 1) {
      const ip = ips[0];

      if (ip.includes(":") && !ip.startsWith("[")) {
        return `[${ip}]:${port}`;
      } else {
        return `${ip}:${port}`;
      }
    }

    const firstIp = ips[0];
    let formattedFirstIp;

    if (firstIp.includes(":") && !firstIp.startsWith("[")) {
      formattedFirstIp = `[${firstIp}]`;
    } else {
      formattedFirstIp = firstIp;
    }

    return `${formattedFirstIp}:${port} (+${ips.length - 1})`;
  };

  const formatRemoteAddress = (remoteAddr: string): string => {
    if (!remoteAddr) return "";

    const addresses = remoteAddr
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr);

    if (addresses.length === 0) return "";

    if (addresses.length === 1) {
      return addresses[0];
    }

    return `${addresses[0]} (+${addresses.length - 1})`;
  };

  const hasMultipleIps = (ipString: string): boolean => {
    if (!ipString) return false;
    const ips = ipString
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip);

    return ips.length > 1;
  };

  const hasMultipleRemoteAddresses = (remoteAddr: string): boolean => {
    if (!remoteAddr) return false;
    const addresses = remoteAddr
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr);

    return addresses.length > 1;
  };

  const showAddressModal = (ipString: string, port: number, title: string) => {
    if (!ipString || !port) return;

    const ips = ipString
      .split(",")
      .map((ip) => ip.trim())
      .filter((ip) => ip);

    if (ips.length <= 1) {
      copyToClipboard(formatInAddress(ipString, port));

      return;
    }

    const formattedList = ips.map((ip, index) => {
      let formattedAddress;

      if (ip.includes(":") && !ip.startsWith("[")) {
        formattedAddress = `[${ip}]:${port}`;
      } else {
        formattedAddress = `${ip}:${port}`;
      }

      return {
        id: index,
        ip: ip,
        address: formattedAddress,
        copying: false,
      };
    });

    setAddressList(formattedList);
    setAddressModalTitle(`${title} (${ips.length}个)`);
    setAddressModalOpen(true);
  };

  const showRemoteAddressModal = (remoteAddr: string, title: string) => {
    if (!remoteAddr) return;

    const addresses = remoteAddr
      .split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr);

    if (addresses.length <= 1) {
      copyToClipboard(remoteAddr);

      return;
    }

    const formattedList = addresses.map((address, index) => {
      return {
        id: index,
        ip: address,
        address: address,
        copying: false,
      };
    });

    setAddressList(formattedList);
    setAddressModalTitle(`${title} (${addresses.length}个)`);
    setAddressModalOpen(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已复制`);
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const copyAddress = async (addressItem: AddressItem) => {
    try {
      setAddressList((prev) =>
        prev.map((item) =>
          item.id === addressItem.id ? { ...item, copying: true } : item,
        ),
      );
      await copyToClipboard(addressItem.address);
    } catch (error) {
      toast.error("复制失败");
    } finally {
      setAddressList((prev) =>
        prev.map((item) =>
          item.id === addressItem.id ? { ...item, copying: false } : item,
        ),
      );
    }
  };

  const copyAllAddresses = async () => {
    if (addressList.length === 0) return;
    const allAddresses = addressList.map((item) => item.address).join("\n");

    await copyToClipboard(allAddresses);
  };

  const calculateForwardBillingFlow = (forward: Forward): number => {
    if (!forward) return 0;

    const inFlow = forward.inFlow || 0;
    const outFlow = forward.outFlow || 0;

    // 后端已按计费类型处理流量，前端直接使用入站+出站总和
    return inFlow + outFlow;
  };

  if (loading) {
    return (
      <div className="px-4 lg:px-6 flex-grow pt-3 lg:pt-4">
        {/* 骨架屏 - H5 加载占位 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#e5e0d8] dark:border-[#2d2824] p-3 lg:p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-14 h5-skeleton rounded" />
                <div className="h-8 w-8 h5-skeleton rounded-lg" />
              </div>
              <div className="h-6 w-20 h5-skeleton rounded" />
              <div className="h-1.5 w-full h5-skeleton rounded-full" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#e5e0d8] dark:border-[#2d2824] p-4 space-y-4">
          <div className="h-5 w-32 h5-skeleton rounded" />
          <div className="h-48 lg:h-64 w-full h5-skeleton rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-3 lg:py-4">
      {announcement && announcementVisible && (
        <div className="mb-4 px-4 lg:px-6 py-3 rounded-xl border bg-[#FAEEDA] dark:bg-[#2d1f00] border-[#FAC775] dark:border-[#5d3a00] shadow-none flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="p-1.5 bg-[#FAC775]/40 dark:bg-[#5d3a00]/60 rounded-lg flex-shrink-0">
              <svg
                className="w-4 h-4 text-[#633806] dark:text-[#FAC775]"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm text-[#633806] dark:text-[#FAC775]/90 whitespace-pre-wrap break-words">
              {announcement}
            </span>
          </div>
          <button
            className="ml-auto flex-shrink-0 hover:opacity-70 text-[#633806] dark:text-[#FAC775]"
            onClick={() => setAnnouncementVisible(false)}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        </div>
      )}

      {/* 响应式统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5 lg:mb-8">
        <Card className="border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-shadow">
          <CardBody className="p-3 lg:p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs lg:text-sm text-[#6b6560] dark:text-[#8a8480] truncate">
                  总流量
                </p>
                <div className="p-1.5 lg:p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex-shrink-0">
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-base lg:text-xl font-bold text-[#1a1a1a] dark:text-[#e8e2da] truncate">
                {formatFlow(userInfo.flow, "gb")}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-shadow">
          <CardBody className="p-3 lg:p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs lg:text-sm text-[#6b6560] dark:text-[#8a8480] truncate">
                  已用流量
                </p>
                <div className="p-1.5 lg:p-2 bg-green-100 dark:bg-green-500/20 rounded-lg flex-shrink-0">
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-base lg:text-xl font-bold text-[#1a1a1a] dark:text-[#e8e2da] truncate">
                {formatFlow(calculateUserTotalUsedFlow())}
              </p>
              <div className="mt-1">
                {renderProgressBar(
                  calculateUsagePercentage("flow"),
                  "sm",
                  userInfo.flow === 99999,
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-[#9b9590] dark:text-[#5d5854] truncate">
                    {userInfo.flow === 99999
                      ? "无限制"
                      : `${calculateUsagePercentage("flow").toFixed(1)}%`}
                  </p>
                  {userInfo.flowResetTime !== undefined &&
                    userInfo.flowResetTime !== null && (
                      <div className="text-xs text-[#9b9590] dark:text-[#5d5854] flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            clipRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            fillRule="evenodd"
                          />
                        </svg>
                        <span className="truncate">
                          {formatResetTime(userInfo.flowResetTime)}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-shadow">
          <CardBody className="p-3 lg:p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs lg:text-sm text-[#6b6560] dark:text-[#8a8480] truncate">
                  转发配额
                </p>
                <div
                  className="p-1.5 lg:p-2 rounded-lg flex-shrink-0"
                  style={{
                    background: "var(--color-semantic-info-bg)",
                    border: "1px solid var(--color-semantic-info-border)",
                  }}
                >
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5"
                    fill="currentColor"
                    style={{ color: "var(--color-semantic-info-text)" }}
                    viewBox="0 0 20 20"
                  >
                    <path
                      clipRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-base lg:text-xl font-bold text-[#1a1a1a] dark:text-[#e8e2da] truncate">
                {formatNumber(userInfo.num || 0)}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] transition-shadow">
          <CardBody className="p-3 lg:p-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs lg:text-sm text-[#6b6560] dark:text-[#8a8480] truncate">
                  已用转发
                </p>
                <div className="p-1.5 lg:p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex-shrink-0">
                  <svg
                    className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600 dark:text-orange-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      clipRule="evenodd"
                      d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                      fillRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-base lg:text-xl font-bold text-[#1a1a1a] dark:text-[#e8e2da] truncate">
                {forwardList.length}
              </p>
              <div className="mt-1">
                {renderProgressBar(
                  calculateUsagePercentage("forwards"),
                  "sm",
                  userInfo.num === 99999,
                )}
                <p className="text-xs text-[#9b9590] dark:text-[#5d5854] mt-1 truncate">
                  {userInfo.num === 99999
                    ? "无限制"
                    : `${calculateUsagePercentage("forwards").toFixed(1)}%`}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 24小时流量统计图表 */}
      <Card className="mb-5 lg:mb-8 border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-3 px-4 lg:px-6 pt-4 lg:pt-6">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              style={{ color: "#c96442" }}
              viewBox="0 0 24 24"
            >
              <path
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="text-base lg:text-xl font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
              24小时流量统计
            </h2>
          </div>
        </CardHeader>
        <CardBody className="pt-0 px-4 lg:px-6 pb-4 lg:pb-6">
          {statisticsFlows.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-[#9b9590] dark:text-[#5d5854] mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
              <p className="text-[#9b9590] dark:text-[#5d5854]">
                暂无流量统计数据
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 流量趋势图 */}
              <div className="h-48 lg:h-80 w-full">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={processFlowChartData()}>
                    <CartesianGrid
                      className="opacity-30"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      axisLine={{ stroke: "#e5e7eb", strokeWidth: 1 }}
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      axisLine={{ stroke: "#e5e7eb", strokeWidth: 1 }}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (value === 0) return "0";
                        if (value < 1024) return `${value}B`;
                        if (value < 1024 * 1024)
                          return `${(value / 1024).toFixed(1)}K`;
                        if (value < 1024 * 1024 * 1024)
                          return `${(value / (1024 * 1024)).toFixed(1)}M`;

                        return `${(value / (1024 * 1024 * 1024)).toFixed(1)}G`;
                      }}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-[#f0ece6] dark:bg-[#2d2824] border border-[#e5e0d8] dark:border-[#2d2824] rounded-lg shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] p-3">
                              <p className="font-medium text-[#1a1a1a] dark:text-[#e8e2da]">{`时间: ${label}`}</p>
                              <p style={{ color: "#c96442" }}>
                                {`流量: ${formatFlow((payload[0]?.value as number) || 0)}`}
                              </p>
                            </div>
                          );
                        }

                        return null;
                      }}
                    />
                    <Line
                      activeDot={{
                        r: 4,
                        stroke: "#FAC775",
                        strokeWidth: 2,
                        fill: "var(--color-background-primary)",
                      }}
                      dataKey="flow"
                      dot={false}
                      stroke="#c96442"
                      strokeWidth={3}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* 隧道权限 - 管理员不显示 */}
      {!isAdmin && (
        <Card className="mb-6 lg:mb-8 border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#c96442] dark:text-[#d4856a]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  clipRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  fillRule="evenodd"
                />
              </svg>
              <h2 className="text-lg lg:text-xl font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                隧道权限
              </h2>
              <span className="px-2 py-1 bg-[#f0ece6] dark:bg-[#2d2824] dark:bg-[#faf8f5] dark:bg-[#2d2824] text-[#6b6560] dark:text-[#8a8480] rounded-full text-xs">
                {userTunnels.length}
              </span>
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            {userTunnels.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-12 h-12 text-[#9b9590] dark:text-[#5d5854] mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                  />
                </svg>
                <p className="text-[#9b9590] dark:text-[#5d5854]">
                  暂无隧道权限
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userTunnels.map((tunnel) => {
                  const tunnelExpStatus = getExpStatus(tunnel.expTime);

                  return (
                    <div
                      key={tunnel.id}
                      className="border border-[#e5e0d8] dark:border-[#e5e0d8] dark:border-[#2d2824] rounded-lg p-3 lg:p-4 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                            {tunnel.tunnelName} ID: {tunnel.id}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium ${tunnel.tunnelFlow === 1 ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300" : "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"}`}
                            >
                              {tunnel.tunnelFlow === 1
                                ? "单向计费"
                                : "双向计费"}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-medium border ${tunnelExpStatus.bg} ${tunnelExpStatus.color}`}
                            >
                              {tunnelExpStatus.text}
                            </span>
                            {tunnel.flowResetTime !== undefined &&
                              tunnel.flowResetTime !== null && (
                                <span className="text-xs text-[#9b9590] dark:text-[#5d5854]">
                                  {formatResetTime(tunnel.flowResetTime)}
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                        <div>
                          <p className="text-sm text-[#6b6560] dark:text-[#8a8480] mb-1">
                            流量配额
                          </p>
                          <p className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                            {formatFlow(tunnel.flow, "gb")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6b6560] dark:text-[#8a8480] mb-1">
                            已用流量
                          </p>
                          <p className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                            {formatFlow(calculateTunnelUsedFlow(tunnel))}
                          </p>
                          <div className="mt-1">
                            {renderProgressBar(
                              calculateTunnelFlowPercentage(tunnel),
                              "sm",
                              tunnel.flow === 99999,
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-[#6b6560] dark:text-[#8a8480] mb-1">
                            转发配额
                          </p>
                          <p className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                            {formatNumber(tunnel.num)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-[#6b6560] dark:text-[#8a8480] mb-1">
                            已用转发
                          </p>
                          <p className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                            {getTunnelUsedForwards(tunnel.tunnelId)}
                          </p>
                          <div className="mt-1">
                            {renderProgressBar(
                              calculateTunnelForwardPercentage(tunnel),
                              "sm",
                              tunnel.num === 99999,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* 转发配置 */}
      <Card className="border border-[#e5e0d8] dark:border-[#2d2824] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#c96442] dark:text-[#d4856a]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                clipRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                fillRule="evenodd"
              />
            </svg>
            <h2 className="text-lg lg:text-xl font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
              转发配置
            </h2>
            <span className="px-2 py-1 bg-[#f0ece6] dark:bg-[#2d2824] dark:bg-[#faf8f5] dark:bg-[#2d2824] text-[#6b6560] dark:text-[#8a8480] rounded-full text-xs">
              {forwardList.length}
            </span>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          {groupedForwards().length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-[#9b9590] dark:text-[#5d5854] mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
              <p className="text-[#9b9590] dark:text-[#5d5854]">暂无转发配置</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedForwards().map((group) => (
                <div
                  key={group.tunnelName}
                  className="border border-[#e5e0d8] dark:border-[#e5e0d8] dark:border-[#2d2824] rounded-lg p-3 lg:p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                      {group.tunnelName}
                    </h3>
                    <span className="px-2 py-1 bg-primary-100 dark:bg-primary-500/20 text-[#c96442] dark:text-[#d4856a]-700 dark:text-[#c96442] dark:text-[#d4856a]-300 rounded-md text-sm">
                      {group.forwards.length} 个转发
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {group.forwards.map((forward) => (
                      <div
                        key={forward.id}
                        className="bg-white dark:bg-[#f0ece6] dark:bg-[#2d2824]/50 border border-[#e5e0d8] dark:border-[#2d2824] rounded-lg p-3 hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow"
                      >
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-[#1a1a1a] dark:text-[#e8e2da] text-sm mb-2 truncate">
                              {forward.name}
                            </h4>
                            <div className="space-y-1">
                              <code
                                className={`block px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded font-mono text-xs truncate ${hasMultipleIps(forward.inIp) ? "cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/30" : ""}`}
                                title={formatInAddress(
                                  forward.inIp,
                                  forward.inPort,
                                )}
                                onClick={() =>
                                  hasMultipleIps(forward.inIp) &&
                                  showAddressModal(
                                    forward.inIp,
                                    forward.inPort,
                                    "入口地址",
                                  )
                                }
                              >
                                {formatInAddress(forward.inIp, forward.inPort)}
                              </code>
                              <div className="text-center text-[#9b9590] dark:text-[#5d5854] text-xs">
                                ↓
                              </div>
                              <code
                                className={`block px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-mono text-xs truncate ${hasMultipleRemoteAddresses(forward.remoteAddr) ? "cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-500/30" : ""}`}
                                title={formatRemoteAddress(forward.remoteAddr)}
                                onClick={() =>
                                  hasMultipleRemoteAddresses(
                                    forward.remoteAddr,
                                  ) &&
                                  showRemoteAddressModal(
                                    forward.remoteAddr,
                                    "出口地址",
                                  )
                                }
                              >
                                {formatRemoteAddress(forward.remoteAddr)}
                              </code>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#e5e0d8] dark:border-[#2d2824]">
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div className="text-center">
                                <div className="text-[#9b9590] dark:text-[#5d5854] mb-1">
                                  上传
                                </div>
                                <div className="font-medium text-green-600 dark:text-green-400 truncate">
                                  {formatFlow(forward.inFlow || 0)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[#9b9590] dark:text-[#5d5854] mb-1">
                                  下载
                                </div>
                                <div className="font-medium text-orange-600 dark:text-orange-400 truncate">
                                  {formatFlow(forward.outFlow || 0)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-[#9b9590] dark:text-[#5d5854] mb-1">
                                  计费
                                </div>
                                <div className="font-medium text-[#c96442] dark:text-[#d4856a] truncate">
                                  {formatFlow(
                                    calculateForwardBillingFlow(forward),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 地址列表弹窗 */}
      <Modal
        backdrop="blur"
        isOpen={addressModalOpen}
        placement="center"
        scrollBehavior="outside"
        size="2xl"
        onClose={() => setAddressModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader className="text-base">{addressModalTitle}</ModalHeader>
          <ModalBody className="pb-6">
            <div className="mb-4 text-right">
              <Button size="sm" onClick={copyAllAddresses}>
                复制全部
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {addressList.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 border border-[#e5e0d8] dark:border-[#2d2824] dark:border-[#e5e0d8] dark:border-[#2d2824] rounded-lg"
                >
                  <code className="text-sm flex-1 mr-3 text-[#1a1a1a] dark:text-[#e8e2da]">
                    {item.address}
                  </code>
                  <Button
                    isLoading={item.copying}
                    size="sm"
                    variant="light"
                    onClick={() => copyAddress(item)}
                  >
                    复制
                  </Button>
                </div>
              ))}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
