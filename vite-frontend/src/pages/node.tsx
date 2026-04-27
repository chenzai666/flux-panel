import { useState, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Switch } from "@heroui/switch";
import { Spinner } from "@heroui/spinner";
import { Alert } from "@heroui/alert";
import { Progress } from "@heroui/progress";
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  createNode,
  getNodeList,
  updateNode,
  deleteNode,
  getNodeInstallCommand
} from "@/api";
import { siteConfig } from "@/config/site";

interface Node {
  id: number;
  name: string;
  ip: string;
  serverIp: string;
  portSta: number;
  portEnd: number;
  version?: string;
  http?: number;
  tls?: number;
  socks?: number;
  status: number;
  connectionStatus: 'online' | 'offline';
  systemInfo?: {
    cpuUsage: number;
    memoryUsage: number;
    uploadTraffic: number;
    downloadTraffic: number;
    uploadSpeed: number;
    downloadSpeed: number;
    uptime: number;
  } | null;
  copyLoading?: boolean;
}

interface NodeForm {
  id: number | null;
  name: string;
  ipString: string;
  serverIp: string;
  portSta: number;
  portEnd: number;
  http: number;
  tls: number;
  socks: number;
}

const NODE_ORDER_KEY = 'node_sort_order';

const DragHandleIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="5" cy="3" r="1.2" /><circle cx="11" cy="3" r="1.2" />
    <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
    <circle cx="5" cy="13" r="1.2" /><circle cx="11" cy="13" r="1.2" />
  </svg>
);

interface SortableNodeCardProps {
  node: Node;
  isBatchMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (n: Node) => void;
  onDelete: (n: Node) => void;
  onInstall: (n: Node) => void;
  formatSpeed: (b: number) => string;
  formatUptime: (s: number) => string;
  formatTraffic: (b: number) => string;
  getProgressColor: (v: number, offline?: boolean) => "default" | "primary" | "secondary" | "success" | "warning" | "danger";
}

function SortableNodeCard({
  node, isBatchMode, isSelected, onToggleSelect, onEdit, onDelete, onInstall,
  formatSpeed, formatUptime, formatTraffic, getProgressColor
}: SortableNodeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: isBatchMode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  const isOnline = node.connectionStatus === 'online';

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b] shadow-none rounded-xl hover:shadow-sm transition-all duration-200 select-none ${
          !isOnline ? 'opacity-60 grayscale-[20%]' : ''
        } ${isSelected ? 'ring-2 ring-[#c96442] ring-offset-1' : ''}`}
        onClick={isBatchMode ? () => onToggleSelect(node.id) : undefined}
        style={{ cursor: isBatchMode ? 'pointer' : 'default' }}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start w-full gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {isBatchMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(node.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 flex-shrink-0 accent-[#c96442] cursor-pointer"
                  />
                )}
                <h3 className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da] truncate text-sm">{node.name}</h3>
              </div>
              <p className="text-xs text-[#9b9590] dark:text-[#5d5854] truncate">{node.serverIp}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                isOnline ? 'badge-status-success' : 'badge-status-danger'
              }`}>
                {isOnline ? '在线' : '离线'}
              </span>
              {!isBatchMode && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing text-[#c0bbb5] hover:text-[#9b9590] p-1 touch-none rounded"
                  title="拖动排序"
                >
                  <DragHandleIcon />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardBody
          className="pt-0 pb-4"
          onClick={isBatchMode ? e => e.stopPropagation() : undefined}
        >
          {/* Basic info */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm min-w-0">
              <span className="text-[#6b6560] dark:text-[#8a8480] flex-shrink-0">入口IP</span>
              <div className="text-right min-w-0 flex-1 ml-2">
                {node.ip ? (
                  node.ip.split(',').length > 1 ? (
                    <span className="font-mono text-xs text-[#6b6560] dark:text-[#8a8480] truncate block" title={node.ip.split(',')[0].trim()}>
                      {node.ip.split(',')[0].trim()} <span className="text-[#9b9590]">+{node.ip.split(',').length - 1}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-[#6b6560] dark:text-[#8a8480] truncate block">{node.ip.trim()}</span>
                  )
                ) : <span className="text-[#9b9590] text-xs">—</span>}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b6560] dark:text-[#8a8480]">端口</span>
              <span className="font-mono text-xs text-[#6b6560] dark:text-[#8a8480]">{node.portSta}–{node.portEnd}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b6560] dark:text-[#8a8480]">版本</span>
              <span className="font-mono text-xs text-[#6b6560] dark:text-[#8a8480]">{node.version || '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b6560] dark:text-[#8a8480]">开机时间</span>
              <span className="text-xs">
                {isOnline && node.systemInfo ? formatUptime(node.systemInfo.uptime) : '-'}
              </span>
            </div>
          </div>

          {/* System monitor */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>CPU</span>
                  <span className="font-mono">{isOnline && node.systemInfo ? `${node.systemInfo.cpuUsage.toFixed(1)}%` : '-'}</span>
                </div>
                <Progress
                  value={isOnline && node.systemInfo ? node.systemInfo.cpuUsage : 0}
                  color={getProgressColor(isOnline && node.systemInfo ? node.systemInfo.cpuUsage : 0, !isOnline)}
                  size="sm" aria-label="CPU使用率"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>内存</span>
                  <span className="font-mono">{isOnline && node.systemInfo ? `${node.systemInfo.memoryUsage.toFixed(1)}%` : '-'}</span>
                </div>
                <Progress
                  value={isOnline && node.systemInfo ? node.systemInfo.memoryUsage : 0}
                  color={getProgressColor(isOnline && node.systemInfo ? node.systemInfo.memoryUsage : 0, !isOnline)}
                  size="sm" aria-label="内存使用率"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-[#faf8f5] dark:bg-[#2d2824] rounded">
                <div className="text-[#6b6560] dark:text-[#8a8480] mb-0.5">上传</div>
                <div className="font-mono">{isOnline && node.systemInfo ? formatSpeed(node.systemInfo.uploadSpeed) : '-'}</div>
              </div>
              <div className="text-center p-2 bg-[#faf8f5] dark:bg-[#2d2824] rounded">
                <div className="text-[#6b6560] dark:text-[#8a8480] mb-0.5">下载</div>
                <div className="font-mono">{isOnline && node.systemInfo ? formatSpeed(node.systemInfo.downloadSpeed) : '-'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-primary-50 dark:bg-primary-100/20 rounded border border-primary-200 dark:border-primary-300/20">
                <div className="text-[#c96442] dark:text-[#d4856a] mb-0.5">↑ 上行</div>
                <div className="font-mono text-[#c96442] dark:text-[#d4856a]">
                  {isOnline && node.systemInfo ? formatTraffic(node.systemInfo.uploadTraffic) : '-'}
                </div>
              </div>
              <div className="text-center p-2 bg-success-50 dark:bg-success-100/20 rounded border border-success-200 dark:border-success-300/20">
                <div className="text-success-600 dark:text-success-400 mb-0.5">↓ 下行</div>
                <div className="font-mono text-success-700 dark:text-success-300">
                  {isOnline && node.systemInfo ? formatTraffic(node.systemInfo.downloadTraffic) : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          {!isBatchMode && (
            <div className="flex gap-1.5">
              <Button size="sm" variant="flat" color="success" onPress={() => onInstall(node)}
                isLoading={node.copyLoading} className="flex-1 min-h-8">
                安装
              </Button>
              <Button size="sm" variant="flat" color="primary" onPress={() => onEdit(node)} className="flex-1 min-h-8">
                编辑
              </Button>
              <Button size="sm" variant="flat" color="danger" onPress={() => onDelete(node)} className="flex-1 min-h-8">
                删除
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function NodePage() {
  const [nodeList, setNodeList] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);
  const [protocolDisabled, setProtocolDisabled] = useState(false);
  const [protocolDisabledReason, setProtocolDisabledReason] = useState('');

  // Batch mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  const [form, setForm] = useState<NodeForm>({
    id: null, name: '', ipString: '', serverIp: '',
    portSta: 1000, portEnd: 65535, http: 0, tls: 0, socks: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [installCommandModal, setInstallCommandModal] = useState(false);
  const [installCommand, setInstallCommand] = useState('');
  const [currentNodeName, setCurrentNodeName] = useState('');

  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    loadNodes();
    initWebSocket();
    return () => { closeWebSocket(); };
  }, []);

  const applySavedOrder = (data: Node[]): Node[] => {
    try {
      const saved = localStorage.getItem(NODE_ORDER_KEY);
      if (!saved) return data;
      const order = JSON.parse(saved) as number[];
      return [...data].sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } catch {
      return data;
    }
  };

  const loadNodes = async () => {
    setLoading(true);
    try {
      const res = await getNodeList();
      if (res.code === 0) {
        const mapped = res.data.map((node: any) => ({
          ...node,
          connectionStatus: node.status === 1 ? 'online' : 'offline',
          systemInfo: null,
          copyLoading: false
        }));
        setNodeList(applySavedOrder(mapped));
      } else {
        toast.error(res.msg || '加载节点列表失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const initWebSocket = () => {
    if (websocketRef.current &&
        (websocketRef.current.readyState === WebSocket.OPEN ||
         websocketRef.current.readyState === WebSocket.CONNECTING)) return;
    if (websocketRef.current) closeWebSocket();

    const baseUrl = axios.defaults.baseURL || (import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api/v1/` : '/api/v1/');
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/$/, '') + `/system-info?type=0&secret=${localStorage.getItem('token')}`;

    try {
      websocketRef.current = new WebSocket(wsUrl);
      websocketRef.current.onopen = () => { reconnectAttemptsRef.current = 0; };
      websocketRef.current.onmessage = (event) => {
        try { handleWebSocketMessage(JSON.parse(event.data)); } catch {}
      };
      websocketRef.current.onerror = () => {};
      websocketRef.current.onclose = () => {
        websocketRef.current = null;
        attemptReconnect();
      };
    } catch {
      attemptReconnect();
    }
  };

  const handleWebSocketMessage = (data: any) => {
    const { id, type, data: messageData } = data;
    if (type === 'status') {
      setNodeList(prev => prev.map(node => node.id == id ? {
        ...node,
        connectionStatus: messageData === 1 ? 'online' : 'offline',
        systemInfo: messageData === 0 ? null : node.systemInfo
      } : node));
    } else if (type === 'info') {
      setNodeList(prev => prev.map(node => {
        if (node.id != id) return node;
        try {
          const systemInfo = typeof messageData === 'string' ? JSON.parse(messageData) : messageData;
          const currentUpload = parseInt(systemInfo.bytes_transmitted) || 0;
          const currentDownload = parseInt(systemInfo.bytes_received) || 0;
          const currentUptime = parseInt(systemInfo.uptime) || 0;
          let uploadSpeed = 0, downloadSpeed = 0;
          if (node.systemInfo && node.systemInfo.uptime) {
            const timeDiff = currentUptime - node.systemInfo.uptime;
            if (timeDiff > 0 && timeDiff <= 10) {
              const ud = currentUpload - (node.systemInfo.uploadTraffic || 0);
              const dd = currentDownload - (node.systemInfo.downloadTraffic || 0);
              if (currentUpload >= (node.systemInfo.uploadTraffic || 0) && ud >= 0) uploadSpeed = ud / timeDiff;
              if (currentDownload >= (node.systemInfo.downloadTraffic || 0) && dd >= 0) downloadSpeed = dd / timeDiff;
            }
          }
          return { ...node, connectionStatus: 'online', systemInfo: { cpuUsage: parseFloat(systemInfo.cpu_usage) || 0, memoryUsage: parseFloat(systemInfo.memory_usage) || 0, uploadTraffic: currentUpload, downloadTraffic: currentDownload, uploadSpeed, downloadSpeed, uptime: currentUptime } };
        } catch { return node; }
      }));
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      reconnectTimerRef.current = setTimeout(() => initWebSocket(), 3000 * reconnectAttemptsRef.current);
    }
  };

  const closeWebSocket = () => {
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    reconnectAttemptsRef.current = 0;
    if (websocketRef.current) {
      websocketRef.current.onopen = null;
      websocketRef.current.onmessage = null;
      websocketRef.current.onerror = null;
      websocketRef.current.onclose = null;
      if (websocketRef.current.readyState === WebSocket.OPEN || websocketRef.current.readyState === WebSocket.CONNECTING) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
    }
    setNodeList(prev => prev.map(node => ({ ...node, connectionStatus: 'offline', systemInfo: null })));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setNodeList(prev => {
        const oldIndex = prev.findIndex(n => n.id === active.id);
        const newIndex = prev.findIndex(n => n.id === over.id);
        const next = arrayMove(prev, oldIndex, newIndex);
        localStorage.setItem(NODE_ORDER_KEY, JSON.stringify(next.map(n => n.id)));
        return next;
      });
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === nodeList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(nodeList.map(n => n.id)));
  };

  const enterBatchMode = () => { setIsBatchMode(true); setSelectedIds(new Set()); };
  const exitBatchMode = () => { setIsBatchMode(false); setSelectedIds(new Set()); };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleteLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteNode(id)));
      toast.success(`成功删除 ${selectedIds.size} 个节点`);
      setBatchDeleteModalOpen(false);
      exitBatchMode();
      loadNodes();
    } catch {
      toast.error('批量删除失败，请重试');
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond === 0) return '0 B/s';
    const k = 1024, sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    if (seconds === 0) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const formatTraffic = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgressColor = (value: number, offline = false): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
    if (offline) return "default";
    if (value <= 50) return "success";
    if (value <= 80) return "warning";
    return "danger";
  };

  const validateIp = (ip: string): boolean => {
    if (!ip || !ip.trim()) return false;
    const trimmedIp = ip.trim();
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    if (ipv4Regex.test(trimmedIp) || ipv6Regex.test(trimmedIp) || trimmedIp === 'localhost') return true;
    if (/^\d+$/.test(trimmedIp)) return false;
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+$/;
    const singleLabelDomain = /^[a-zA-Z][a-zA-Z0-9\-]{0,62}$/;
    return domainRegex.test(trimmedIp) || singleLabelDomain.test(trimmedIp);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = '请输入节点名称';
    else if (form.name.trim().length < 2) newErrors.name = '节点名称长度至少2位';
    else if (form.name.trim().length > 50) newErrors.name = '节点名称长度不能超过50位';
    if (!form.ipString.trim()) {
      newErrors.ipString = '请输入入口IP地址';
    } else {
      const ips = form.ipString.split('\n').map(ip => ip.trim()).filter(ip => ip);
      if (ips.length === 0) newErrors.ipString = '请输入至少一个有效IP地址';
      else {
        for (let i = 0; i < ips.length; i++) {
          if (!validateIp(ips[i])) { newErrors.ipString = `第${i + 1}行IP地址格式错误: ${ips[i]}`; break; }
        }
      }
    }
    if (!form.serverIp.trim()) newErrors.serverIp = '请输入服务器IP地址';
    else if (!validateIp(form.serverIp.trim())) newErrors.serverIp = '请输入有效的IPv4、IPv6地址或域名';
    if (!form.portSta || form.portSta < 1 || form.portSta > 65535) newErrors.portSta = '端口范围必须在1-65535之间';
    if (!form.portEnd || form.portEnd < 1 || form.portEnd > 65535) newErrors.portEnd = '端口范围必须在1-65535之间';
    else if (form.portEnd < form.portSta) newErrors.portEnd = '结束端口不能小于起始端口';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    setDialogTitle('新增节点');
    setIsEdit(false);
    setDialogVisible(true);
    resetForm();
    setProtocolDisabled(true);
    setProtocolDisabledReason('节点未在线，等待节点上线后再设置');
  };

  const handleEdit = (node: Node) => {
    setDialogTitle('编辑节点');
    setIsEdit(true);
    setForm({
      id: node.id, name: node.name,
      ipString: node.ip ? node.ip.split(',').map(ip => ip.trim()).join('\n') : '',
      serverIp: node.serverIp || '', portSta: node.portSta, portEnd: node.portEnd,
      http: typeof node.http === 'number' ? node.http : 1,
      tls: typeof node.tls === 'number' ? node.tls : 1,
      socks: typeof node.socks === 'number' ? node.socks : 1
    });
    const offline = node.connectionStatus !== 'online';
    setProtocolDisabled(offline);
    setProtocolDisabledReason(offline ? '节点未在线，等待节点上线后再设置' : '');
    setDialogVisible(true);
  };

  const handleDelete = (node: Node) => { setNodeToDelete(node); setDeleteModalOpen(true); };

  const confirmDelete = async () => {
    if (!nodeToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await deleteNode(nodeToDelete.id);
      if (res.code === 0) {
        toast.success('删除成功');
        setNodeList(prev => prev.filter(n => n.id !== nodeToDelete.id));
        setDeleteModalOpen(false);
        setNodeToDelete(null);
      } else {
        toast.error(res.msg || '删除失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInstall = async (node: Node) => {
    setNodeList(prev => prev.map(n => n.id === node.id ? { ...n, copyLoading: true } : n));
    try {
      const res = await getNodeInstallCommand(node.id);
      if (res.code === 0 && res.data) {
        try {
          await navigator.clipboard.writeText(res.data);
          toast.success('安装命令已复制到剪贴板');
        } catch {
          setInstallCommand(res.data);
          setCurrentNodeName(node.name);
          setInstallCommandModal(true);
        }
      } else {
        toast.error(res.msg || '获取安装命令失败');
      }
    } catch {
      toast.error('获取安装命令失败');
    } finally {
      setNodeList(prev => prev.map(n => n.id === node.id ? { ...n, copyLoading: false } : n));
    }
  };

  const handleManualCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      toast.success('安装命令已复制到剪贴板');
      setInstallCommandModal(false);
    } catch {
      toast.error('复制失败，请手动选择文本复制');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitLoading(true);
    try {
      const ipString = form.ipString.split('\n').map(ip => ip.trim()).filter(ip => ip).join(',');
      const submitData = { ...form, ip: ipString };
      delete (submitData as any).ipString;
      const apiCall = isEdit ? updateNode : createNode;
      const data = isEdit ? submitData : { name: form.name, ip: ipString, serverIp: form.serverIp, portSta: form.portSta, portEnd: form.portEnd, http: form.http, tls: form.tls, socks: form.socks };
      const res = await apiCall(data);
      if (res.code === 0) {
        toast.success(isEdit ? '更新成功' : '创建成功');
        setDialogVisible(false);
        if (isEdit) {
          setNodeList(prev => prev.map(n => n.id === form.id ? { ...n, name: form.name, ip: ipString, serverIp: form.serverIp, portSta: form.portSta, portEnd: form.portEnd, http: form.http, tls: form.tls, socks: form.socks } : n));
        } else {
          loadNodes();
        }
      } else {
        toast.error(res.msg || (isEdit ? '更新失败' : '创建失败'));
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ id: null, name: '', ipString: '', serverIp: '', portSta: 1000, portEnd: 65535, http: 0, tls: 0, socks: 0 });
    setErrors({});
  };

  const allSelected = nodeList.length > 0 && selectedIds.size === nodeList.length;
  const partialSelected = selectedIds.size > 0 && selectedIds.size < nodeList.length;

  return (
    <div className="px-4 lg:px-6 py-4 lg:py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        {isBatchMode ? (
          <>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = partialSelected; }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-[#c96442] cursor-pointer"
                />
                <span className="text-sm text-[#6b6560] dark:text-[#8a8480]">
                  {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : '全选'}
                </span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm" color="danger" variant="flat"
                isDisabled={selectedIds.size === 0}
                onPress={() => setBatchDeleteModalOpen(true)}
                className="font-medium"
              >
                删除 ({selectedIds.size})
              </Button>
              <Button size="sm" variant="light" className="text-[#6b6560]" onPress={exitBatchMode}>
                取消
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[17px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">节点管理</h1>
            <div className="flex items-center gap-2">
              {nodeList.length > 0 && (
                <Button size="sm" variant="flat" className="text-[#6b6560] dark:text-[#8a8480]" onPress={enterBatchMode}>
                  批量操作
                </Button>
              )}
              <Button
                size="sm"
                className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg"
                onPress={handleAdd}
              >
                新增节点
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Node cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-[#6b6560] dark:text-[#8a8480]">正在加载...</span>
          </div>
        </div>
      ) : nodeList.length === 0 ? (
        <Card className="border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b] shadow-none rounded-xl">
          <CardBody className="text-center py-16">
            <svg className="w-10 h-10 text-[#d0cac2] dark:text-[#3d3834] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12l4-4m-4 4l4 4" />
            </svg>
            <p className="text-sm text-[#9b9590] dark:text-[#5d5854]">暂无节点配置</p>
          </CardBody>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={nodeList.map(n => n.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {nodeList.map(node => (
                <SortableNodeCard
                  key={node.id}
                  node={node}
                  isBatchMode={isBatchMode}
                  isSelected={selectedIds.has(node.id)}
                  onToggleSelect={handleToggleSelect}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onInstall={handleInstall}
                  formatSpeed={formatSpeed}
                  formatUptime={formatUptime}
                  formatTraffic={formatTraffic}
                  getProgressColor={getProgressColor}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={dialogVisible} onClose={() => setDialogVisible(false)} size="2xl" scrollBehavior="outside" backdrop="blur" placement="center">
        <ModalContent>
          <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold">{dialogTitle}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input label="节点名称" placeholder="请输入节点名称" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                isInvalid={!!errors.name} errorMessage={errors.name} variant="bordered" />
              <Input label="服务器IP" placeholder="请输入服务器IP地址，如: 192.168.1.100 或 example.com" value={form.serverIp}
                onChange={e => setForm(p => ({ ...p, serverIp: e.target.value }))}
                isInvalid={!!errors.serverIp} errorMessage={errors.serverIp} variant="bordered" />
              <Textarea label="入口IP" placeholder="一行一个IP地址或域名，例如:&#10;192.168.1.100&#10;example.com"
                value={form.ipString} onChange={e => setForm(p => ({ ...p, ipString: e.target.value }))}
                isInvalid={!!errors.ipString} errorMessage={errors.ipString}
                variant="bordered" minRows={3} maxRows={5} description="支持多个IP，每行一个地址" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="起始端口" type="number" placeholder="1000" value={form.portSta.toString()}
                  onChange={e => setForm(p => ({ ...p, portSta: parseInt(e.target.value) || 1000 }))}
                  isInvalid={!!errors.portSta} errorMessage={errors.portSta} variant="bordered" min={1} max={65535} />
                <Input label="结束端口" type="number" placeholder="65535" value={form.portEnd.toString()}
                  onChange={e => setForm(p => ({ ...p, portEnd: parseInt(e.target.value) || 65535 }))}
                  isInvalid={!!errors.portEnd} errorMessage={errors.portEnd} variant="bordered" min={1} max={65535} />
              </div>
              <div className="mt-1">
                <div className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e2da]">屏蔽协议</div>
                <div className="text-xs text-[#9b9590] dark:text-[#5d5854] mb-2">开启开关以屏蔽对应协议</div>
                {protocolDisabled && (
                  <Alert color="warning" variant="flat" description={protocolDisabledReason || '等待节点上线后再设置'} className="mb-2" />
                )}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#faf8f5] dark:bg-[#2d2824] p-3 rounded-md border border-[#e5e0d8] dark:border-[#2d2824]/30 ${protocolDisabled ? 'opacity-70' : ''}`}>
                  {[
                    { key: 'http' as const, label: 'HTTP', icon: <rect x="2" y="4" width="20" height="16" rx="2"/>, icon2: <path d="M2 10h20"/> },
                    { key: 'tls' as const, label: 'TLS', icon: <path d="M6 10V7a6 6 0 1 1 12 0v3"/>, icon2: <rect x="4" y="10" width="16" height="10" rx="2"/> },
                    { key: 'socks' as const, label: 'SOCKS', icon: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>, icon2: <><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></> },
                  ].map(({ key, label, icon, icon2 }) => (
                    <div key={key} className="px-3 py-3 rounded-lg bg-white dark:bg-[#2d2824] border border-[#e5e0d8] dark:border-[#2d2824]/30 hover:border-primary-200 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-[#9b9590]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}{icon2}</svg>
                        <div className="text-sm font-medium text-[#1a1a1a] dark:text-[#e8e2da]">{label}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-[#9b9590]">禁用/启用</div>
                        <Switch size="sm" isSelected={form[key] === 1} isDisabled={protocolDisabled}
                          onValueChange={v => setForm(p => ({ ...p, [key]: v ? 1 : 0 }))} />
                      </div>
                      <div className="mt-1 text-xs text-[#9b9590]">{form[key] === 1 ? '已开启' : '已关闭'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Alert color="danger" variant="flat"
                description="请不要在出口节点执行屏蔽协议，否则可能影响转发；屏蔽协议仅需在入口节点执行。" className="mt-3" />
              <Alert color="primary" variant="flat"
                description="服务器ip是你要添加的服务器的ip地址，不是面板的ip地址。入口ip是用于展示在转发页面，面向用户的访问地址。实在理解不到说明你没这个需求，都填节点的服务器ip就行！" className="mt-4" />
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-[#e5e0d8] dark:border-[#2d2824] pt-4">
            <Button variant="light" className="text-[#6b6560] dark:text-[#8a8480]" onPress={() => setDialogVisible(false)}>取消</Button>
            <Button className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg" onPress={handleSubmit} isLoading={submitLoading}>
              {submitLoading ? '提交中...' : '确定'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Single Delete Modal */}
      <Modal isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen} size="sm" backdrop="blur" placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold text-[#791F1F] dark:text-[#f7a0a0]">确认删除</ModalHeader>
              <ModalBody>
                <p className="text-[#6b6560] dark:text-[#8a8480]">确定要删除节点 <span className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">"{nodeToDelete?.name}"</span> 吗？</p>
                <p className="text-sm text-[#9b9590] dark:text-[#5d5854] mt-2">此操作不可恢复。</p>
              </ModalBody>
              <ModalFooter className="border-t border-[#e5e0d8] dark:border-[#2d2824] pt-4">
                <Button variant="light" className="text-[#6b6560] dark:text-[#8a8480]" onPress={onClose}>取消</Button>
                <Button color="danger" onPress={confirmDelete} isLoading={deleteLoading}>
                  {deleteLoading ? '删除中...' : '确认删除'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Batch Delete Modal */}
      <Modal isOpen={batchDeleteModalOpen} onOpenChange={setBatchDeleteModalOpen} size="sm" backdrop="blur" placement="center">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold text-[#791F1F] dark:text-[#f7a0a0]">批量删除确认</ModalHeader>
              <ModalBody>
                <p className="text-[#6b6560] dark:text-[#8a8480]">确定要删除选中的 <span className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">{selectedIds.size}</span> 个节点吗？</p>
                <p className="text-sm text-[#9b9590] dark:text-[#5d5854] mt-2">此操作不可恢复，请谨慎操作。</p>
              </ModalBody>
              <ModalFooter className="border-t border-[#e5e0d8] dark:border-[#2d2824] pt-4">
                <Button variant="light" className="text-[#6b6560] dark:text-[#8a8480]" onPress={onClose}>取消</Button>
                <Button color="danger" onPress={handleBatchDelete} isLoading={batchDeleteLoading}>
                  {batchDeleteLoading ? '删除中...' : `确认删除 ${selectedIds.size} 个`}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Install Command Modal */}
      <Modal isOpen={installCommandModal} onClose={() => setInstallCommandModal(false)} size="2xl" scrollBehavior="outside" backdrop="blur" placement="center">
        <ModalContent>
          <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold">
            <div>
              <div>安装命令 — {currentNodeName}</div>
              <div className="text-xs font-normal text-[#9b9590] mt-0.5">
                当前最新镜像版本: <code className="font-mono text-[#c96442]">v{siteConfig.app_version}</code>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-[#6b6560] dark:text-[#8a8480]">请复制以下安装命令到服务器上执行：</p>
              <div className="relative">
                <Textarea
                  value={installCommand}
                  readOnly
                  variant="bordered"
                  minRows={6}
                  maxRows={10}
                  classNames={{ input: "font-mono text-sm" }}
                />
                <Button size="sm" color="primary" variant="flat" className="absolute top-2 right-2" onPress={handleManualCopy}>
                  复制
                </Button>
              </div>
              <div className="text-xs text-[#9b9590] dark:text-[#5d5854]">
                💡 提示：如果复制按钮失效，请手动选择上方文本进行复制
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setInstallCommandModal(false)}>关闭</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
